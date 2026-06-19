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

export async function validateGeneratedCodeFiles(
  files: Array<{ path: string; code?: string; content?: string }>,
): Promise<GeneratedCodeIssue[]> {
  const ts = await import("typescript");
  const issues: GeneratedCodeIssue[] = [];

  for (const file of files) {
    const code = file.code ?? file.content ?? "";
    if (!code.trim() || !isValidatablePath(file.path)) continue;

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
