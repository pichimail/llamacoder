import CodeRunnerReact from "./code-runner-react";
import type { PreviewMode } from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  files,
  extraDependencies,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  previewMode,
  onPreviewModeChange,
}: {
  language?: string;
  code?: string;
  files?: Array<{ path: string; content?: string; code?: string }>;
  extraDependencies?: Record<string, string>;
  onRequestFix?: (e: string) => void;
  onPreviewError?: (e: string) => void;
  onPreviewReady?: () => void;
  previewMode?: PreviewMode;
  onPreviewModeChange?: (mode: PreviewMode) => void;
}) {
  const actualFiles = (
    files || (code ? [{ path: "App.tsx", content: code }] : [])
  ).map((f) => ({
    path: f.path,
    content:
      typeof f.content === "string"
        ? f.content
        : typeof f.code === "string"
          ? f.code
          : "",
  }));
  return (
    <CodeRunnerReact
      files={actualFiles}
      extraDependencies={extraDependencies}
      onRequestFix={onRequestFix}
      onPreviewError={onPreviewError}
      onPreviewReady={onPreviewReady}
      previewMode={previewMode}
      onPreviewModeChange={onPreviewModeChange}
    />
  );
}
