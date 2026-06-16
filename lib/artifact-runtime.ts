export type ArtifactRuntime = "react" | "python" | "streamlit";

type ArtifactFile = { path: string; content?: string; code?: string };

function fileContent(file: ArtifactFile) {
  return file.content ?? file.code ?? "";
}

export function detectArtifactRuntime(files: ArtifactFile[]): ArtifactRuntime {
  if (files.length === 0) return "react";

  const paths = files.map((file) => file.path.toLowerCase());
  const hasPython = paths.some((path) => path.endsWith(".py"));
  const hasReact = paths.some((path) =>
    /\.(tsx|jsx)$/.test(path) || path.includes("app/page"),
  );

  if (hasPython && !hasReact) {
    const joined = files.map(fileContent).join("\n");
    if (/import\s+streamlit|streamlit\s+as\s+st/.test(joined)) {
      return "streamlit";
    }
    return "python";
  }

  return "react";
}

export function isStreamlitArtifact(files: ArtifactFile[]) {
  return detectArtifactRuntime(files) === "streamlit";
}