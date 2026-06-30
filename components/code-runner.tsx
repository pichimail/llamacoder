"use client";

import dynamic from "next/dynamic";
import { detectArtifactRuntime } from "@/lib/artifact-runtime";
import { withArtifactRuntimeCompat } from "@/lib/artifact-runtime-compat";
import CodeRunnerReact from "./code-runner-react";
import type { PreviewMode } from "./code-runner-react";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";

const PythonArtifactRunner = dynamic(
  () => import("./python-artifact-runner"),
  { ssr: false },
);

type RuntimeFile = { path: string; content: string };

function cleanRuntimePath(path: string) {
  return path.trim().replace(/^\/+/, "").replace(/^src\//, "");
}

function importPathFor(path: string) {
  return `./${cleanRuntimePath(path).replace(/\.(tsx|jsx|ts|js|css)$/i, "")}`;
}

function pickRenderableEntry(files: RuntimeFile[]) {
  const normalized = files.map((file) => ({ ...file, cleanPath: cleanRuntimePath(file.path) }));
  return (
    normalized.find((file) => file.cleanPath === "app/page.tsx") ||
    normalized.find((file) => file.cleanPath === "pages/index.tsx") ||
    normalized.find((file) => file.cleanPath === "App.tsx") ||
    normalized.find((file) => /\.(tsx|jsx)$/i.test(file.cleanPath) && /export\s+default|return\s*\(|<[A-Z]/.test(file.content))
  );
}

function ensureSandpackEntry(files: RuntimeFile[]): RuntimeFile[] {
  const hasExplicitAppEntry = files.some((file) => cleanRuntimePath(file.path) === "App.tsx");
  if (hasExplicitAppEntry || files.length === 0) return files;

  const entry = pickRenderableEntry(files);
  if (!entry) return files;

  const cssImports = files
    .map((file) => cleanRuntimePath(file.path))
    .filter((path) => path.endsWith(".css") && path !== "app/globals.css")
    .map((path) => `import './${path}';`)
    .join("\n");

  return [
    ...files,
    {
      path: "App.tsx",
      content: `import React from 'react';
import './app/globals.css';
${cssImports}
import { ensureTwind } from '@/lib/twind';
import MainComponent from '${importPathFor(entry.cleanPath)}';

ensureTwind();

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MainComponent />
    </div>
  );
}
`,
    },
  ];
}

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
  showWebPreviewChrome,
  onRefresh,
  sandpackOptions,
  hiddenValidation,
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
  showWebPreviewChrome?: boolean;
  onRefresh?: () => void;
  sandpackOptions?: SandpackBuildOptions;
  hiddenValidation?: boolean;
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
  })).filter((f) => f.path && f.content.trim()); // FIXED: Filter out empty files
  
  // FIXED: Return empty state if no valid files
  if (actualFiles.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background/50 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No files to preview</p>
          <p className="mt-1 text-xs">Waiting for generated code...</p>
        </div>
      </div>
    );
  }
  
  const runtime = detectArtifactRuntime(actualFiles);
  if (runtime === "python" || runtime === "streamlit") {
    return <PythonArtifactRunner files={actualFiles} runtime={runtime} />;
  }

  const previewFiles = ensureSandpackEntry(withArtifactRuntimeCompat(actualFiles));

  return (
    <CodeRunnerReact
      files={previewFiles}
      extraDependencies={extraDependencies}
      onRequestFix={onRequestFix}
      onPreviewError={onPreviewError}
      onPreviewReady={onPreviewReady}
      previewMode={previewMode}
      onPreviewModeChange={onPreviewModeChange}
      showDeviceToggle={showDeviceToggle}
      showWebPreviewChrome={showWebPreviewChrome}
      onRefresh={onRefresh}
      sandpackOptions={sandpackOptions}
      hiddenValidation={hiddenValidation}
    />
  );
}
