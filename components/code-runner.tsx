import dynamic from "next/dynamic";
import { detectArtifactRuntime } from "@/lib/artifact-runtime";
import CodeRunnerReact from "./code-runner-react";
import type { PreviewMode } from "./code-runner-react";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";

const PythonArtifactRunner = dynamic(
  () => import("./python-artifact-runner"),
  { ssr: false },
);

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
  showDeviceToggle,
  sandpackOptions,
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
  showDeviceToggle?: boolean;
  sandpackOptions?: SandpackBuildOptions;
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
  const runtime = detectArtifactRuntime(actualFiles);
  if (runtime === "python" || runtime === "streamlit") {
    return <PythonArtifactRunner files={actualFiles} runtime={runtime} />;
  }

  return (
    <CodeRunnerReact
      files={actualFiles}
      extraDependencies={extraDependencies}
      onRequestFix={onRequestFix}
      onPreviewError={onPreviewError}
      onPreviewReady={onPreviewReady}
      previewMode={previewMode}
      onPreviewModeChange={onPreviewModeChange}
      showDeviceToggle={showDeviceToggle}
      sandpackOptions={sandpackOptions}
    />
  );
}
