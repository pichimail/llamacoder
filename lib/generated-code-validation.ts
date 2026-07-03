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
  "react", "react-dom", "lucide-react", "framer-motion", "tailwindcss", "zod",
  "@radix-ui/react-dialog", "@radix-ui/react-slot", "sonner", "next", "clsx", "tailwind-merge"
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
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    const pkg = spec.split("/")[0];
    if (!ALLOWED_DEPS.has(pkg) && !pkg.startsWith("@/") && !pkg.startsWith("node:")) {
      bad.push(spec);
    }
  }
  return bad;
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
  const ts = await import("typescript");
  const issues: GeneratedCodeIssue[] = [];

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
