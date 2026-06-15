"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import {
  AlertTriangle,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  CopyIcon,
  Monitor,
  RefreshCw,
  Smartphone,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getSandpackConfig } from "@/lib/sandpack-config";

export type PreviewMode = "web" | "mobile";

const previewModes: Array<{
  value: PreviewMode;
  label: string;
  icon: typeof Monitor;
  viewportWidth: string;
}> = [
  { value: "web", label: "Web", icon: Monitor, viewportWidth: "100%" },
  { value: "mobile", label: "Mobile", icon: Smartphone, viewportWidth: "min(100%, 390px)" },
];

function inferArtifactRoutes(files: Array<{ path: string; content: string }>) {
  const routes = new Set<string>();
  for (const file of files) {
    const normalized = file.path.replace(/^\/+/, "").replace(/^src\//, "");
    if (/^app\/.+\/page\.(tsx|jsx|ts|js)$/.test(normalized) || normalized === "app/page.tsx" || normalized === "app/page.jsx") {
      const route = normalized
        .replace(/^app\//, "/")
        .replace(/\/page\.(tsx|jsx|ts|js)$/, "")
        .replace(/\(.*?\)\/?/g, "")
        .replace(/\/+/g, "/");
      routes.add(route === "/page.tsx" || route === "/page.jsx" || route === "" ? "/" : route);
    }
    if (normalized === "pages/index.tsx" || normalized === "pages/index.jsx") routes.add("/");
    const pagesMatch = normalized.match(/^pages\/(.+)\.(tsx|jsx|ts|js)$/);
    if (pagesMatch && pagesMatch[1] !== "index") routes.add(`/${pagesMatch[1].replace(/\/index$/, "")}`);
  }
  return Array.from(routes).map((route) => route || "/").sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
}

export default function ReactCodeRunner({
  files,
  extraDependencies,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  previewMode,
  onPreviewModeChange,
  showDeviceToggle = false,
}: {
  files: Array<{ path: string; content: string }>;
  extraDependencies?: Record<string, string>;
  onRequestFix?: (e: string) => void;
  onPreviewError?: (e: string) => void;
  onPreviewReady?: () => void;
  previewMode?: PreviewMode;
  onPreviewModeChange?: (mode: PreviewMode) => void;
  showDeviceToggle?: boolean;
}) {
  const filesKey = files.map((f) => f.path + f.content).join("") + JSON.stringify(extraDependencies || {});
  const [internalPreviewMode, setInternalPreviewMode] = useState<PreviewMode>("web");
  const [routeIndex, setRouteIndex] = useState(0);
  const activePreviewMode = previewMode ?? internalPreviewMode;
  const handlePreviewModeChange = onPreviewModeChange ?? setInternalPreviewMode;
  const routes = useMemo(() => inferArtifactRoutes(files), [filesKey]);
  const activeRoute = routes[routeIndex] || "/";
  const activeModeConfig = useMemo(
    () => previewModes.find((mode) => mode.value === activePreviewMode) ?? previewModes[0],
    [activePreviewMode],
  );
  const Preview = SandpackPreview as unknown as React.ComponentType<any>;

  useEffect(() => {
    setRouteIndex(0);
  }, [filesKey]);

  return (
    <SandpackProvider
      key={`${filesKey}:${activeRoute}`}
      data-preview-mode={activePreviewMode}
      style={{ "--preview-viewport-width": activeModeConfig.viewportWidth } as CSSProperties}
      className="relative h-full w-full [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:items-center [&_.sp-preview-container]:justify-center [&_.sp-preview-container]:overflow-auto [&_.sp-preview-iframe]:!w-[var(--preview-viewport-width)] [&_.sp-preview-iframe]:!max-w-[var(--preview-viewport-width)] [&_.sp-preview-iframe]:grow [&_.sp-preview-iframe]:!rounded-xl [&_.sp-preview-iframe]:!border [&_.sp-preview-iframe]:!border-border [&_.sp-preview-iframe]:!bg-background"
      {...getSandpackConfig(files, extraDependencies)}
    >
      {routes.length > 1 && (
        <ArtifactRouteControls
          routes={routes}
          activeRoute={activeRoute}
          onPrevious={() => setRouteIndex((index) => (index - 1 + routes.length) % routes.length)}
          onNext={() => setRouteIndex((index) => (index + 1) % routes.length)}
        />
      )}
      <Preview
        startRoute={activeRoute}
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        actionsChildren={showDeviceToggle ? <PreviewModeSwitcher activeMode={activePreviewMode} onChange={handlePreviewModeChange} /> : undefined}
        className="h-full w-full"
      />
      <PreviewStatusMonitor onRequestFix={onRequestFix} onPreviewError={onPreviewError} onPreviewReady={onPreviewReady} />
    </SandpackProvider>
  );
}

function ArtifactRouteControls({ routes, activeRoute, onPrevious, onNext }: { routes: string[]; activeRoute: string; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border/70 bg-background/35 px-1.5 py-1 text-xs text-muted-foreground backdrop-blur-sm" aria-label="Artifact route navigation">
      <button type="button" onClick={onPrevious} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Previous artifact page">
        <ChevronLeft className="size-3.5" />
      </button>
      <span className="max-w-[160px] truncate font-mono text-[11px] text-foreground" title={activeRoute}>{activeRoute}</span>
      <button type="button" onClick={onNext} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Next artifact page">
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}

function PreviewModeSwitcher({ activeMode, onChange }: { activeMode: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const nextMode = activeMode === "web" ? "mobile" : "web";
  const Icon = activeMode === "web" ? Smartphone : Monitor;
  return (
    <button
      type="button"
      aria-pressed={activeMode === "mobile"}
      aria-label={`Switch to ${nextMode} preview`}
      onClick={() => onChange(nextMode)}
      className="inline-flex h-7 items-center justify-center rounded-md border border-border/70 bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function PreviewStatusMonitor({
  onRequestFix,
  onPreviewError,
  onPreviewReady,
}: {
  onRequestFix?: (e: string) => void;
  onPreviewError?: (e: string) => void;
  onPreviewReady?: () => void;
}) {
  const { sandpack, listen } = useSandpack();
  const [didCopy, setDidCopy] = useState(false);
  const [lastRuntimeError, setLastRuntimeError] = useState<string>("");

  useEffect(() => {
    if (sandpack.error) {
      const message = sandpack.error.message;
      setLastRuntimeError(message);
      onPreviewError?.(message);
    }
  }, [sandpack.error, onPreviewError]);

  useEffect(() => {
    let readyTimer: number | undefined;
    const unsubscribe = listen((message) => {
      if (message.type === "done") {
        const doneMessage = message as unknown as {
          compilationError?: unknown;
          compilatonError?: unknown;
        };
        const compileError = doneMessage.compilationError || doneMessage.compilatonError;
        if (compileError) {
          const errorText = typeof compileError === "string" ? compileError : JSON.stringify(compileError, null, 2);
          setLastRuntimeError(errorText);
          onPreviewError?.(errorText);
          window.clearTimeout(readyTimer);
          return;
        }
        window.clearTimeout(readyTimer);
        readyTimer = window.setTimeout(() => {
          if (!sandpack.error) {
            setLastRuntimeError("");
            onPreviewReady?.();
          }
        }, 1000);
      }
      if (message.type === "action" && (message as any).action === "show-error") {
        window.clearTimeout(readyTimer);
      }
    });

    return () => {
      window.clearTimeout(readyTimer);
      unsubscribe();
    };
  }, [listen, onPreviewError, onPreviewReady, sandpack.error]);

  const errorMessage = sandpack.error?.message || lastRuntimeError;
  if (!errorMessage) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/55 p-4 text-base backdrop-blur-sm" role="alert">
      <div className="w-full max-w-[560px] rounded-xl border border-red-500/40 bg-background/90 p-4 text-foreground shadow-2xl shadow-black/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Preview/runtime error
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Auto-fix can patch missing imports, broken exports, invalid JSX, and dependency errors into a new version.
        </p>
        <pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-border bg-transparent p-3 font-mono text-xs leading-relaxed text-red-100/90">
          {errorMessage}
        </pre>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={async () => {
              setDidCopy(true);
              await window.navigator.clipboard.writeText(errorMessage);
              await new Promise((resolve) => setTimeout(resolve, 1200));
              setDidCopy(false);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs text-foreground transition hover:border-foreground/40"
            aria-label="Copy preview error"
          >
            {didCopy ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            Copy log
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs text-foreground transition hover:border-foreground/40"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
            </button>
            <button
              onClick={() => onRequestFix?.(errorMessage)}
              disabled={!onRequestFix}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs font-medium text-foreground transition hover:border-foreground/40 disabled:opacity-40"
              aria-label="Try to automatically fix the error"
            >
              <Wand2 className="size-3.5" aria-hidden="true" /> Try fix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
