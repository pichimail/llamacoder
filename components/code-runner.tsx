"use client";

import dynamic from "next/dynamic";
import { detectArtifactRuntime, getStackFromFiles } from "@/lib/artifact-runtime";
import { withArtifactRuntimeCompat } from "@/lib/artifact-runtime-compat";
import CodeRunnerReact from "./code-runner-react";
import type { PreviewMode } from "./code-runner-react";
import { DotFlow } from "@/components/ui/dot-flow";
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
  const stack = getStackFromFiles(actualFiles);

  if (runtime === "python" || runtime === "streamlit") {
    return <PythonArtifactRunner files={actualFiles} runtime={runtime} stack={stack} />;
  }

  if (runtime === "flutter") {
    return <FlutterWebPreview files={actualFiles} stack={stack} />;
  }

  if (stack && !["react", "nextjs", "vite-react"].some(s => stack.stack.includes(s)) && runtime !== "react") {
    // For other stacks, show rich instructions + files preview + run commands
    return <GenericStackPreview files={actualFiles} stack={stack} />;
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

// Dynamic preview for Flutter (web capable)
function FlutterWebPreview({ files, stack }: { files: any[]; stack?: any }) {
  const mainDart = files.find(f => f.path.endsWith('.dart')) || files[0];
  return (
    <div className="flex h-full flex-col bg-background p-6">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium">Flutter Project</span>
        {stack && <span className="text-xs text-muted-foreground">({stack.stack})</span>}
      </div>
      <div className="flex-1 overflow-auto rounded border border-border/70 bg-zinc-950 p-4 font-mono text-xs text-emerald-300">
        <pre>{mainDart?.content || mainDart?.code || 'No Dart source'}</pre>
      </div>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-xs">
        <div className="font-medium text-amber-400">To preview live:</div>
        <div className="mt-1 text-amber-300/80">flutter pub get && flutter run -d chrome</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Or use bootstrap.sh from workspace. Web preview requires local Flutter SDK.</div>
      </div>
    </div>
  );
}

// Generic stack preview with dynamic run commands from detection + bootstrap
function GenericStackPreview({ files, stack }: { files: any[]; stack?: any }) {
  const commands = stack ? [
    stack.installCommand,
    stack.devCommand,
    stack.buildCommand,
  ].filter(Boolean) : ["See RUN.md or bootstrap.sh in workspace"];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border/70 bg-muted/20 px-4 py-3 text-sm font-medium flex items-center gap-2">
        Dynamic Stack Preview: <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">{stack?.stack || 'generic'}</span>
        {stack?.framework && <span className="text-muted-foreground">({stack.framework})</span>}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Auto-detected run commands</div>
          <div className="rounded bg-zinc-950 p-3 font-mono text-sm text-foreground space-y-1">
            {commands.map((cmd, i) => <div key={i} className="text-emerald-400">{cmd}</div>)}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Key files ({files.length})</div>
          <div className="grid grid-cols-1 gap-1 text-xs max-h-48 overflow-auto">
            {files.slice(0, 12).map((f, idx) => (
              <div key={idx} className="flex justify-between border-b border-border/40 py-0.5 font-mono">
                <span>{f.path}</span>
                <span className="text-muted-foreground">{(f.content || f.code || '').length} chars</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          Full live preview not available for this stack in-browser. Use the <strong>terminal</strong> or download <code>bootstrap.sh</code> / <code>RUN.md</code> from workspace files to run locally with correct commands.
          Paste Git URL again or type <code>import-git &lt;url&gt;</code> / <code>bootstrap</code> in the workspace shell.
        </div>
      </div>
    </div>
  );
}
