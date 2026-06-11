import CodeRunnerReact from "./code-runner-react";
import type { PreviewMode } from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  files,
  onRequestFix,
  previewMode,
  onPreviewModeChange,
}: {
  language?: string;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  previewMode?: PreviewMode;
  onPreviewModeChange?: (mode: PreviewMode) => void;
}) {
  const actualFiles =
    files || (code ? [{ path: "App.tsx", content: code }] : []);
  return (
    <CodeRunnerReact
      files={actualFiles}
      onRequestFix={onRequestFix}
      previewMode={previewMode}
      onPreviewModeChange={onPreviewModeChange}
    />
  );
}
