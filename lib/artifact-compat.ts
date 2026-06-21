type ArtifactRuntimeFile = { path: string; content: string };

type ImportRecord = {
  specifier: string;
  defaultName?: string;
  named: Set<string>;
  typeOnly: Set<string>;
};

const INTERNAL_ALIAS_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["'](@\/(?:components|hooks|lib|utils|types)\/[^"']+)["'];?/g;
const KNOWN_EXT_RE = /\.(tsx|ts|jsx|js)$/i;

function normalizePath(path: string) {
  return path.trim().replace(/^\/+/, "").replace(/^src\//, "");
}

function toModuleBase(specifier: string) {
  return normalizePath(specifier.replace(/^@\//, ""));
}

function moduleCandidates(base: string) {
  if (KNOWN_EXT_RE.test(base)) return [base];
  return [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
    `${base}/index.jsx`,
    `${base}/index.js`,
  ];
}

function hasModule(existingPaths: Set<string>, base: string) {
  return moduleCandidates(base).some((candidate) => existingPaths.has(candidate));
}

function shimPathFor(base: string) {
  if (KNOWN_EXT_RE.test(base)) return base;
  if (base.startsWith("components/")) return `${base}.tsx`;
  return `${base}.ts`;
}

function parseNamedImports(clause: string) {
  const names = new Set<string>();
  const match = clause.match(/\{([\s\S]*?)\}/);
  if (!match) return names;

  for (const rawPart of match[1].split(",")) {
    const part = rawPart.trim().replace(/^type\s+/, "");
    if (!part) continue;
    const imported = part.split(/\s+as\s+/i)[0]?.trim();
    if (/^[A-Za-z_$][\w$]*$/.test(imported || "")) names.add(imported!);
  }

  return names;
}

function parseDefaultImport(clause: string) {
  const trimmed = clause.trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("*")) return undefined;
  const first = trimmed.split(",")[0]?.trim().replace(/^type\s+/, "");
  return /^[A-Za-z_$][\w$]*$/.test(first || "") ? first : undefined;
}

function mergeImport(records: Map<string, ImportRecord>, importRecord: ImportRecord) {
  const existing = records.get(importRecord.specifier);
  if (!existing) {
    records.set(importRecord.specifier, importRecord);
    return;
  }
  if (importRecord.defaultName) existing.defaultName ||= importRecord.defaultName;
  importRecord.named.forEach((name) => existing.named.add(name));
  importRecord.typeOnly.forEach((name) => existing.typeOnly.add(name));
}

function collectInternalImports(files: ArtifactRuntimeFile[]) {
  const records = new Map<string, ImportRecord>();

  for (const file of files) {
    if (!/\.(tsx|ts|jsx|js)$/.test(file.path)) continue;
    let match: RegExpExecArray | null;
    INTERNAL_ALIAS_RE.lastIndex = 0;
    while ((match = INTERNAL_ALIAS_RE.exec(file.content)) !== null) {
      const typeOnlyImport = Boolean(match[1]);
      const clause = match[2] || "";
      const specifier = match[3];
      const named = typeOnlyImport ? new Set<string>() : parseNamedImports(clause);
      const typeOnly = typeOnlyImport ? parseNamedImports(clause) : new Set<string>();
      const defaultName = typeOnlyImport ? undefined : parseDefaultImport(clause);
      mergeImport(records, { specifier, defaultName, named, typeOnly });
    }
  }

  return Array.from(records.values());
}

function componentShim(record: ImportRecord) {
  const exports = Array.from(record.named)
    .map((name) => `export const ${name} = FallbackComponent;`)
    .join("\n");
  return `import * as React from "react";

type FallbackProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

function FallbackComponent({ children, className, ...props }: FallbackProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

${exports}
export default FallbackComponent;
`;
}

function hookShim(record: ImportRecord) {
  const customHooks = Array.from(record.named)
    .filter((name) => !["useLocalStorageState", "useMediaQuery"].includes(name))
    .map((name) => `export function ${name}<T = unknown>(fallback?: T): T {
  return fallback as T;
}`)
    .join("\n\n");

  return `import * as React from "react";

export function useLocalStorageState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !query) return;
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, [query]);

  return matches;
}

${customHooks}
export default useMediaQuery;
`;
}

function genericValueExport(name: string) {
  if (/^[A-Z]/.test(name)) {
    return `export const ${name} = FallbackComponent;`;
  }

  if (/^seed/i.test(name)) {
    return `export function ${name}(input?: unknown) {
  return {
    id: "assistant-" + Date.now(),
    role: "assistant",
    content: typeof input === "string" ? input : "Preview response ready.",
    createdAt: new Date().toISOString(),
  };
}`;
  }

  if (/^strip/i.test(name) || /^serialize/i.test(name) || /^normalize/i.test(name)) {
    return `export function ${name}<T>(value: T): T {
  return value;
}`;
  }

  return `export function ${name}(...args: unknown[]) {
  return args[0] ?? null;
}`;
}

function libShim(record: ImportRecord) {
  const typeExports = Array.from(record.typeOnly)
    .map((name) => `export type ${name} = any;`)
    .join("\n");
  const valueExports = Array.from(record.named)
    .filter((name) => !record.typeOnly.has(name))
    .map(genericValueExport)
    .join("\n\n");
  const defaultExport = record.defaultName ? "\nconst compatDefault = (...args: unknown[]) => args[0] ?? null;\nexport default compatDefault;\n" : "";

  return `import * as React from "react";

type FallbackProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };
function FallbackComponent({ children, className, ...props }: FallbackProps) {
  return <div className={className} {...props}>{children}</div>;
}

export function cn(...values: unknown[]) {
  return values.flat().filter(Boolean).join(" ");
}

${typeExports}
${valueExports}
${defaultExport}`;
}

function shimFor(record: ImportRecord) {
  const base = toModuleBase(record.specifier);
  if (base.startsWith("components/")) return componentShim(record);
  if (base.startsWith("hooks/")) return hookShim(record);
  return libShim(record);
}

export function withArtifactCompatFiles(files: ArtifactRuntimeFile[]) {
  const normalizedFiles = files.map((file) => ({
    path: normalizePath(file.path),
    content: file.content ?? "",
  }));
  const existingPaths = new Set(normalizedFiles.map((file) => file.path));
  const additions: ArtifactRuntimeFile[] = [];

  for (const record of collectInternalImports(normalizedFiles)) {
    const base = toModuleBase(record.specifier);
    if (hasModule(existingPaths, base)) continue;
    const path = shimPathFor(base);
    if (existingPaths.has(path)) continue;
    existingPaths.add(path);
    additions.push({ path, content: shimFor(record) });
  }

  return additions.length ? [...normalizedFiles, ...additions] : normalizedFiles;
}
