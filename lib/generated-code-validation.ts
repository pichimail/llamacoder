import type * as TypeScript from "typescript";

export type GeneratedCodeIssue = {
  path: string;
  line: number;
  column: number;
  message: string;
  excerpt: string;
};

const VALIDATABLE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

function getScriptKind(ts: typeof TypeScript, path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (ext === "tsx" || ext === "jsx") return ts.ScriptKind.TSX;
  return ts.ScriptKind.JS;
}

function getExcerpt(source: string, lineIndex: number) {
  const lines = source.split(/\r?\n/);
  const line = lines[lineIndex] ?? "";
  return line.trimEnd();
}

function isValidatablePath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return VALIDATABLE_EXTENSIONS.has(ext);
}

const ALLOWED_DEPS = new Set([
  "@hookform/resolvers",
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-visually-hidden",
  "@twind/core",
  "@twind/preset-autoprefix",
  "@twind/preset-tailwind",
  "animejs",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "framer-motion",
  "gsap",
  "lucide-react",
  "next",
  "next-themes",
  "react",
  "react-day-picker",
  "react-dom",
  "react-hook-form",
  "react-resizable-panels",
  "react-router-dom",
  "recharts",
  "sonner",
  "tailwind-merge",
  "tailwindcss",
  "three",
  "vaul",
  "zod",
  "zustand",
]);

const KNOWN_SANDBOX_FILES = new Set([
  "lib/utils.ts",
  "lib/next-navigation.ts",
  "lib/next-link.tsx",
  "lib/next-image.tsx",
]);

function hasPathTraversal(p: string): boolean {
  return p.includes("..") || p.startsWith("/") || p.includes("://") || /\0/.test(p);
}

function detectBadImports(code: string): string[] {
  const bad: string[] = [];
  const importRe = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(code))) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) continue;
    const pkg = spec.split("/")[0];
    if (!ALLOWED_DEPS.has(pkg) && !pkg.startsWith("node:")) {
      bad.push(spec);
    }
  }
  return bad;
}

function normalizeArtifactPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^src\//, "");
}

function dirname(path: string) {
  const normalized = normalizeArtifactPath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function joinPath(base: string, spec: string) {
  const parts = `${base ? `${base}/` : ""}${spec}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function extractImportSpecifiers(code: string) {
  const imports = new Set<string>();
  const importExportRe = /\b(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = importExportRe.exec(code))) imports.add(match[1]);
  while ((match = dynamicImportRe.exec(code))) imports.add(match[1]);
  return Array.from(imports);
}

function possibleModulePaths(base: string) {
  const withoutExtension = base.replace(/\.(tsx|ts|jsx|js|css|json|mjs|cjs)$/i, "");
  return [
    base,
    `${withoutExtension}.tsx`,
    `${withoutExtension}.ts`,
    `${withoutExtension}.jsx`,
    `${withoutExtension}.js`,
    `${withoutExtension}.css`,
    `${withoutExtension}.json`,
    `${withoutExtension}/index.tsx`,
    `${withoutExtension}/index.ts`,
    `${withoutExtension}/index.jsx`,
    `${withoutExtension}/index.js`,
  ];
}

function detectUnresolvedLocalImports(
  path: string,
  code: string,
  availablePaths: Set<string>,
): string[] {
  const unresolved: string[] = [];

  for (const spec of extractImportSpecifiers(code)) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
    const candidateBase = spec.startsWith("@/")
      ? spec.slice(2)
      : joinPath(dirname(path), spec);

    const resolved = possibleModulePaths(candidateBase).some((candidate) => {
      const normalized = normalizeArtifactPath(candidate);
      return availablePaths.has(normalized) || KNOWN_SANDBOX_FILES.has(normalized);
    });

    if (!resolved) unresolved.push(spec);
  }

  return unresolved;
}

function detectPlaceholderCode(code: string): string | null {
  const compact = code.trim().replace(/\s+/g, " ");
  if (!compact) return null;

  if (/^\.{2,}\s*code\s*\.{2,}$/i.test(compact)) {
    return "Placeholder ellipsis code is not a runnable implementation";
  }
  if (/^(?:\/\/|\/\*|#)?\s*(?:todo|implementation goes here|insert code here|your code here|full file content|complete runnable implementation goes here)/i.test(compact)) {
    return "Placeholder implementation text is not runnable code";
  }
  if (compact.length < 24 && !/[{}=();]/.test(compact)) {
    return "Generated file is too small to be a real runnable source file";
  }
  if (/\.\.\.\s*(?:code|implementation|rest of|remaining)|(?:code|implementation)\s*\.\.\./i.test(compact)) {
    return "Generated file contains ellipsis placeholders instead of complete code";
  }

  return null;
}

export async function validateGeneratedCodeFiles(
  files: Array<{ path: string; code?: string; content?: string }>,
): Promise<GeneratedCodeIssue[]> {
  const issues: GeneratedCodeIssue[] = [];
  let tsModule: typeof TypeScript | null = null;
  const availablePaths = new Set(
    files
      .filter((file) => typeof file.path === "string")
      .map((file) => normalizeArtifactPath(file.path)),
  );

  for (const file of files) {
    const code = file.code ?? file.content ?? "";
    if (!code.trim() || !isValidatablePath(file.path)) continue;

    if (hasPathTraversal(file.path)) {
      issues.push({ path: file.path, line: 1, column: 1, message: "Path traversal or absolute path rejected", excerpt: file.path });
      continue;
    }

    const placeholderIssue = detectPlaceholderCode(code);
    if (placeholderIssue) {
      issues.push({ path: file.path, line: 1, column: 1, message: placeholderIssue, excerpt: getExcerpt(code, 0) });
      continue;
    }

    const bad = detectBadImports(code);
    for (const b of bad) {
      issues.push({ path: file.path, line: 1, column: 1, message: `Unapproved external dependency: ${b}`, excerpt: b });
    }

    const unresolved = detectUnresolvedLocalImports(file.path, code, availablePaths);
    for (const spec of unresolved) {
      issues.push({
        path: file.path,
        line: 1,
        column: 1,
        message: `Unresolved local import: ${spec}. Generate the imported file or remove the import before preview.`,
        excerpt: spec,
      });
    }

    tsModule ??= await import("typescript");
    const ts = tsModule;
    const scriptKind = getScriptKind(ts, file.path);
    const sourceFile = ts.createSourceFile(file.path, code, ts.ScriptTarget.Latest, true, scriptKind);
    const diagnostics = ts.transpileModule(code, {
      compilerOptions: {
        allowJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        noEmit: true,
        isolatedModules: true,
      },
      fileName: file.path,
      reportDiagnostics: true,
    }).diagnostics ?? [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
      const start = diagnostic.start ?? 0;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
      issues.push({
        path: file.path,
        line: line + 1,
        column: character + 1,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        excerpt: getExcerpt(code, line),
      });
    }
  }

  return issues;
}

export function formatGeneratedCodeIssues(issues: GeneratedCodeIssue[]) {
  if (issues.length === 0) return "";

  return issues
    .map((issue, index) => {
      const header = `${index + 1}. ${issue.path}:${issue.line}:${issue.column}`;
      const lines = [header, `   ${issue.message}`];
      if (issue.excerpt) lines.push(`   > ${issue.excerpt}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
