import { detectStack, type StackInfo } from "./stack-detector";

export type ArtifactRuntime = "react" | "python" | "streamlit" | "flutter" | "generic";

type ArtifactFile = { path: string; content?: string; code?: string };

function fileContent(file: ArtifactFile) {
  return file.content ?? file.code ?? "";
}

export function detectArtifactRuntime(files: ArtifactFile[]): ArtifactRuntime {
  if (files.length === 0) return "react";

  const paths = files.map((file) => file.path.toLowerCase());
  const hasPython = paths.some((path) => path.endsWith(".py"));
  const hasReactTsx = paths.some((path) => /\.(tsx|jsx)$/.test(path) || path.includes("app/page"));
  const hasDart = paths.some((path) => path.endsWith(".dart"));
  const hasPubspec = paths.some((path) => path.endsWith("pubspec.yaml"));

  // Use advanced stack detector for richer cases
  try {
    const stackInfo = detectStack({ files: files.map(f => ({path: f.path, content: fileContent(f)})) });
    if (stackInfo.stack === "flutter" || (hasDart && hasPubspec)) return "flutter";
    if (["python-streamlit", "python-fastapi", "python-flask", "python-django", "python-generic"].includes(stackInfo.stack)) {
      const joined = files.map(fileContent).join("\n");
      return /streamlit|st\./i.test(joined) ? "streamlit" : "python";
    }
  } catch {}

  if (hasPython && !hasReactTsx) {
    const joined = files.map(fileContent).join("\n");
    if (/import\s+streamlit|streamlit\s+as\s+st/i.test(joined)) {
      return "streamlit";
    }
    return "python";
  }

  if (hasDart || hasPubspec) return "flutter";

  return "react";
}

export function isStreamlitArtifact(files: ArtifactFile[]) {
  return detectArtifactRuntime(files) === "streamlit";
}

export function getStackFromFiles(files: ArtifactFile[]): StackInfo | null {
  try {
    return detectStack({ files: files.map(f => ({path: f.path, content: fileContent(f)})) });
  } catch {
    return null;
  }
}