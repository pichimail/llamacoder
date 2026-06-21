type RuntimeFile = { path: string; content: string };

type ImportNeed = {
  specifier: string;
  defaultName?: string;
  valueNames: Set<string>;
  typeNames: Set<string>;
};

const INTERNAL_IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["'](@\/(?:components|hooks|lib|utils|types)\/[^"']+)["'];?/g;
const EXT_RE = /\.(tsx|ts|jsx|js)$/i;

function cleanPath(path: string) {
  return path.trim().replace(/^\/+/, "").replace(/^src\//, "");
}

function specToBase(specifier: string) {
  return cleanPath(specifier.replace(/^@\//, ""));
}

function candidates(base: string) {
  if (EXT_RE.test(base)) return [base];
  return [`${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`, `${base}/index.tsx`, `${base}/index.ts`, `${base}/index.jsx`, `${base}/index.js`];
}

function hasModule(paths: Set<string>, base: string) {
  return candidates(base).some((path) => paths.has(path));
}

function targetPath(base: string) {
  if (EXT_RE.test(base)) return base;
  return base.startsWith("components/") ? `${base}.tsx` : `${base}.ts`;
}

function namedImports(clause: string) {
  const output = new Set<string>();
  const match = clause.match(/\{([\s\S]*?)\}/);
  if (!match) return output;
  for (const raw of match[1].split(",")) {
    const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/i)[0]?.trim();
    if (name && /^[A-Za-z_$][\w$]*$/.test(name)) output.add(name);
  }
  return output;
}

function defaultImport(clause: string) {
  const trimmed = clause.trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("*")) return undefined;
  const first = trimmed.split(",")[0]?.trim();
  return first && /^[A-Za-z_$][\w$]*$/.test(first) ? first : undefined;
}

function collectNeeds(files: RuntimeFile[]) {
  const needs = new Map<string, ImportNeed>();

  for (const file of files) {
    if (!/\.(tsx|ts|jsx|js)$/.test(file.path)) continue;
    INTERNAL_IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INTERNAL_IMPORT_RE.exec(file.content))) {
      const isTypeOnly = Boolean(match[1]);
      const clause = match[2] || "";
      const specifier = match[3];
      const current = needs.get(specifier) || { specifier, valueNames: new Set<string>(), typeNames: new Set<string>() };
      if (isTypeOnly) {
        namedImports(clause).forEach((name) => current.typeNames.add(name));
      } else {
        current.defaultName ||= defaultImport(clause);
        namedImports(clause).forEach((name) => current.valueNames.add(name));
      }
      needs.set(specifier, current);
    }
  }

  return Array.from(needs.values());
}

function componentShim(need: ImportNeed) {
  const named = Array.from(need.valueNames).map((name) => `export const ${name} = FallbackComponent;`).join("\n");
  return `import * as React from "react";

type FallbackProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };
function FallbackComponent({ children, ...props }: FallbackProps) {
  return React.createElement("div", props, children);
}

${named}
export default FallbackComponent;
`;
}

function hooksShim(need: ImportNeed) {
  const extra = Array.from(need.valueNames)
    .filter((name) => name !== "useLocalStorageState" && name !== "useMediaQuery")
    .map((name) => `export function ${name}<T = unknown>(fallback?: T): T { return fallback as T; }`)
    .join("\n");
  return `import * as React from "react";

export function useLocalStorageState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) as T : initialValue;
    } catch {
      return initialValue;
    }
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !query) return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

${extra}
export default useMediaQuery;
`;
}

function valueExport(name: string) {
  if (/^[A-Z]/.test(name)) return `export const ${name} = FallbackComponent;`;
  if (/^strip|^normalize|^serialize/i.test(name)) return `export function ${name}<T>(value: T): T { return value; }`;
  if (/^seed/i.test(name)) return `export function ${name}(input?: unknown) { return { id: "assistant-" + Date.now(), role: "assistant", content: typeof input === "string" ? input : "Preview response ready." }; }`;
  return `export function ${name}(...args: unknown[]) { return args[0] ?? null; }`;
}

function libShim(need: ImportNeed) {
  const types = Array.from(need.typeNames).map((name) => `export type ${name} = any;`).join("\n");
  const values = Array.from(need.valueNames).filter((name) => !need.typeNames.has(name)).map(valueExport).join("\n");
  const defaultExport = need.defaultName ? `const compatDefault = (...args: unknown[]) => args[0] ?? null;\nexport default compatDefault;` : "";
  return `type FallbackProps = { children?: unknown; className?: string; [key: string]: unknown };
const FallbackComponent = (_props: FallbackProps) => null;

export function cn(...values: unknown[]) { return values.flat().filter(Boolean).join(" "); }
${types}
${values}
${defaultExport}
`;
}

function shimFor(need: ImportNeed) {
  const base = specToBase(need.specifier);
  if (base.startsWith("components/")) return componentShim(need);
  if (base.startsWith("hooks/")) return hooksShim(need);
  return libShim(need);
}

export function withArtifactRuntimeCompat(files: RuntimeFile[]) {
  const normalized = files.map((file) => ({ path: cleanPath(file.path), content: file.content ?? "" }));
  const paths = new Set(normalized.map((file) => file.path));
  const additions: RuntimeFile[] = [];

  for (const need of collectNeeds(normalized)) {
    const base = specToBase(need.specifier);
    if (hasModule(paths, base)) continue;
    const path = targetPath(base);
    if (paths.has(path)) continue;
    paths.add(path);
    additions.push({ path, content: shimFor(need) });
  }

  return additions.length ? [...normalized, ...additions] : normalized;
}
