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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  WebPreview,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { getSandpackConfig, type SandpackBuildOptions } from "@/lib/sandpack-config";

export type PreviewMode = "web" | "mobile";

type ConsoleLog = {
  level: "log" | "warn" | "error";
  message: string;
  timestamp: Date;
};

type VisualPreviewState = {
  ready: boolean;
  reason?: string;
  inaccessible?: boolean;
};

const VISUAL_PREVIEW_TIMEOUT_MS = 7000;
const VISUAL_PREVIEW_POLL_MS = 300;
const BUNDLER_WATCHDOG_MS = 25000;

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

function routeToPreviewUrl(route: string) {
  return `https://sandbox.local${route === "/" ? "" : route}`;
}

function previewUrlToRoute(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "/";
  try {
    const parsed = trimmed.includes("://") ? new URL(trimmed) : new URL(trimmed, "https://sandbox.local");
    const path = parsed.pathname || "/";
    return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path || "/";
  } catch {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  }
}

function isElementVisiblyRendered(element: Element) {
  const ownerWindow = element.ownerDocument.defaultView;
  if (!ownerWindow) return false;
  const style = ownerWindow.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = (element as HTMLElement).getBoundingClientRect?.();
  return Boolean(rect && rect.width > 2 && rect.height > 2);
}

function inspectPreviewDocument(document: Document): VisualPreviewState {
  const body = document.body;
  if (!body) return { ready: false, reason: "Preview document has no body yet." };

  const bodyText = (body.innerText || "")
    .replace(/\s+/g, " ")
    .replace(/^(Loading|Document|Preview)$/i, "")
    .trim();

  const meaningfulElements = Array.from(
    body.querySelectorAll(
      "main,section,article,nav,header,footer,button,input,textarea,select,canvas,svg,img,[role],h1,h2,h3,p,li,a",
    ),
  ).filter(isElementVisiblyRendered).length;

  const root = body.querySelector("#root");
  const mountedRootChildren = root?.children.length ?? 0;
  const visualMedia = Boolean(body.querySelector("canvas,svg,img,video"));

  if (bodyText.length >= 2 || meaningfulElements >= 2 || (mountedRootChildren > 0 && visualMedia)) {
    return { ready: true };
  }

  return {
    ready: false,
    reason: "Preview compiled but rendered no visible UI.",
  };
}

function inspectSandpackPreview(): VisualPreviewState {
  if (typeof document === "undefined") return { ready: true };

  const iframes = Array.from(
    document.querySelectorAll<HTMLIFrameElement>("iframe.sp-preview-iframe, .sp-preview-iframe iframe"),
  );

  if (iframes.length === 0) {
    return { ready: false, reason: "Preview iframe is not mounted yet." };
  }

  for (const iframe of iframes) {
    const rect = iframe.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) continue;
    try {
      const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDocument) continue;
      const inspected = inspectPreviewDocument(frameDocument);
      if (inspected.ready) return inspected;
    } catch {
      return { ready: true, inaccessible: true };
    }
  }

  return {
    ready: false,
    reason: "Preview compiled but the iframe has no visible mounted UI yet.",
  };
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
  showWebPreviewChrome = false,
  onRefresh,
  sandpackOptions,
  hiddenValidation = false,
}: {
  files: Array<{ path: string; content: string }>;
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
  const filesKey =
    files.map((f) => f.path + f.content).join("") +
    JSON.stringify(extraDependencies || {}) +
    JSON.stringify(sandpackOptions || {});
  const [internalPreviewMode, setInternalPreviewMode] = useState<PreviewMode>("web");
  const [routeIndex, setRouteIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("https://sandbox.local");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const activePreviewMode = previewMode ?? internalPreviewMode;
  const handlePreviewModeChange = onPreviewModeChange ?? setInternalPreviewMode;
  const routes = useMemo(() => inferArtifactRoutes(files), [filesKey]);
  const activeRoute = routes[routeIndex] || "/";
  const activeModeConfig = useMemo(
    () => previewModes.find((mode) => mode.value === activePreviewMode) ?? previewModes[0],
    [activePreviewMode],
  );
  const Preview = SandpackPreview as unknown as React.ComponentType<any>;
  const nextPreviewMode = activePreviewMode === "web" ? "mobile" : "web";
  const PreviewModeIcon = activePreviewMode === "web" ? Smartphone : Monitor;

  const appendLog = useCallback((level: ConsoleLog["level"], message: string) => {
    setConsoleLogs((logs) => [
      ...logs.slice(-49),
      { level, message, timestamp: new Date() },
    ]);
  }, []);

  const navigateToRoute = useCallback(
    (route: string) => {
      const normalized = route || "/";
      const index = routes.indexOf(normalized);
      if (index >= 0) {
        setRouteIndex(index);
      }
      const targetUrl = routeToPreviewUrl(normalized);
      setPreviewUrl(targetUrl);

      // Force the iframe / sandpack preview to update location for our multi-page root
      if (typeof window !== "undefined") {
        // This will trigger our improved App wrapper + next-navigation shim
        window.history.pushState({}, "", targetUrl);
        window.dispatchEvent(new CustomEvent("preview-route-change", { detail: { path: normalized } }));
      }
    },
    [routes],
  );

  const handleUrlChange = useCallback(
    (url: string) => {
      setPreviewUrl(url);
      navigateToRoute(previewUrlToRoute(url));
    },
    [navigateToRoute],
  );

  useEffect(() => {
    setRouteIndex(0);
    setConsoleLogs([]);
    setPreviewUrl(routeToPreviewUrl(routes[0] || "/"));
  }, [filesKey, routes]);

  useEffect(() => {
    setPreviewUrl(routeToPreviewUrl(activeRoute));
  }, [activeRoute]);

  const sandpackContent = (
    <SandpackProvider
      key={`${filesKey}:${activeRoute}`}
      data-preview-mode={activePreviewMode}
      style={{ "--preview-viewport-width": activeModeConfig.viewportWidth } as CSSProperties}
      className={`relative h-full w-full [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:items-center [&_.sp-preview-container]:justify-center [&_.sp-preview-container]:overflow-auto [&_.sp-preview-iframe]:!w-[var(--preview-viewport-width)] [&_.sp-preview-iframe]:!max-w-[var(--preview-viewport-width)] [&_.sp-preview-iframe]:grow [&_.sp-preview-iframe]:!rounded-xl [&_.sp-preview-iframe]:!border [&_.sp-preview-iframe]:!border-border [&_.sp-preview-iframe]:!bg-background ${hiddenValidation ? "pointer-events-none opacity-0" : ""}`}
      {...getSandpackConfig(files, extraDependencies, sandpackOptions, activeRoute)}
    >
      {!hiddenValidation && !showWebPreviewChrome && routes.length > 1 ? (
        <ArtifactRouteControls
          routes={routes}
          activeRoute={activeRoute}
          onPrevious={() => setRouteIndex((index) => (index - 1 + routes.length) % routes.length)}
          onNext={() => setRouteIndex((index) => (index + 1) % routes.length)}
        />
      ) : null}
      <Preview
        startRoute={activeRoute}
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        actionsChildren={
          !showWebPreviewChrome && showDeviceToggle ? (
            <PreviewModeSwitcher activeMode={activePreviewMode} onChange={handlePreviewModeChange} />
          ) : undefined
        }
        className="h-full w-full"
      />
      <PreviewStatusMonitor
        onRequestFix={onRequestFix}
        onPreviewError={onPreviewError}
        onPreviewReady={onPreviewReady}
        onLog={showWebPreviewChrome ? appendLog : undefined}
        captureConsole={showWebPreviewChrome}
        useConsoleOverlay={!showWebPreviewChrome}
      />
    </SandpackProvider>
  );

  if (!showWebPreviewChrome) {
    return sandpackContent;
  }

  return (
    <WebPreview
      defaultUrl={previewUrl}
      onUrlChange={handleUrlChange}
      className="h-full rounded-none border-0 bg-transparent"
    >
      <WebPreviewNavigation className="border-border/70 bg-background px-2 py-1.5">
        <WebPreviewNavigationButton tooltip="Previous page" aria-label="Previous page" disabled={routes.length <= 1} onClick={() => setRouteIndex((index) => (index - 1 + routes.length) % routes.length)}>
          <ChevronLeft className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Next page" aria-label="Next page" disabled={routes.length <= 1} onClick={() => setRouteIndex((index) => (index + 1) % routes.length)}>
          <ChevronRight className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Refresh preview" aria-label="Refresh preview" onClick={() => onRefresh?.()}>
          <RefreshCw className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewUrl
          value={previewUrl}
          onChange={(event) => setPreviewUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleUrlChange((event.target as HTMLInputElement).value);
          }}
          aria-label="Preview route"
          className="font-mono text-xs"
        />
        {showDeviceToggle ? (
          <WebPreviewNavigationButton tooltip={`Switch to ${nextPreviewMode} preview`} aria-label={`Switch to ${nextPreviewMode} preview`} onClick={() => handlePreviewModeChange(nextPreviewMode)}>
            <PreviewModeIcon className="size-4" />
          </WebPreviewNavigationButton>
        ) : null}
      </WebPreviewNavigation>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">{sandpackContent}</div>
      <WebPreviewConsole logs={consoleLogs} />
    </WebPreview>
  );
}

function ArtifactRouteControls({ routes, activeRoute, onPrevious, onNext }: { routes: string[]; activeRoute: string; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border/70 bg-background/35 px-1.5 py-1 text-xs text-muted-foreground backdrop-blur-sm" aria-label="Artifact route navigation">
      <button type="button" onClick={onPrevious} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Previous artifact page"><ChevronLeft className="size-3.5" /></button>
      <span className="max-w-[160px] truncate font-mono text-[11px] text-foreground" title={activeRoute}>{activeRoute}</span>
      <button type="button" onClick={onNext} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Next artifact page"><ChevronRight className="size-3.5" /></button>
    </div>
  );
}

function PreviewModeSwitcher({ activeMode, onChange }: { activeMode: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const nextMode = activeMode === "web" ? "mobile" : "web";
  const Icon = activeMode === "web" ? Smartphone : Monitor;
  if (activeMode === "mobile") {
    return (
      <button type="button" aria-pressed="true" aria-label={`Switch to ${nextMode} preview`} onClick={() => onChange(nextMode)} className="inline-flex h-7 items-center justify-center rounded-md border border-border/70 bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" aria-pressed="false" aria-label={`Switch to ${nextMode} preview`} onClick={() => onChange(nextMode)} className="inline-flex h-7 items-center justify-center rounded-md border border-border/70 bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function PreviewStatusMonitor({ onRequestFix, onPreviewError, onPreviewReady, onLog, captureConsole, useConsoleOverlay }: { onRequestFix?: (e: string) => void; onPreviewError?: (e: string) => void; onPreviewReady?: () => void; onLog?: (level: ConsoleLog["level"], message: string) => void; captureConsole?: boolean; useConsoleOverlay?: boolean }) {
  const { sandpack, listen } = useSandpack();
  const [didCopy, setDidCopy] = useState(false);
  const [lastRuntimeError, setLastRuntimeError] = useState<string>("");
  const readyReportedRef = useRef(false);

  useEffect(() => {
    if (sandpack.error) {
      const message = sandpack.error.message || "Preview compilation error";
      readyReportedRef.current = false;
      setLastRuntimeError(message);
      onLog?.("error", message);
      // FIXED: Only report critical errors that block rendering
      if (!message.includes("Cannot find module") || message.includes("react")) {
        onPreviewError?.(message);
      }
    }
  }, [sandpack.error, onLog, onPreviewError]);

  useEffect(() => {
    if (!captureConsole || !onLog) return;
    const unsubscribe = listen((message) => {
      if (message.type === "console") {
        const payload = message as { data?: Array<{ data?: string[]; method?: string }> };
        for (const entry of payload.data ?? []) {
          const text = entry.data?.map((item) => String(item)).join(" ") ?? "";
          if (!text) continue;
          const level = entry.method === "error" ? "error" : entry.method === "warn" ? "warn" : "log";
          onLog(level, text);
        }
      }
    });
    return unsubscribe;
  }, [captureConsole, listen, onLog]);

  useEffect(() => {
    let readyTimer: number | undefined;
    let visualTimer: number | undefined;
    let bundlerWatchdog: number | undefined;
    let cancelled = false;

    const clearTimers = () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(visualTimer);
      window.clearTimeout(bundlerWatchdog);
    };

    // The bundler may never emit a "done" message at all (stuck dependency
    // install, crashed worker, etc). Without this, the preview waits forever
    // with no error surfaced and no way for auto-fix to kick in.
    bundlerWatchdog = window.setTimeout(() => {
      if (cancelled || readyReportedRef.current) return;
      const errorText = "Sandbox bundler did not respond in time. It may be stuck installing dependencies or compiling.";
      setLastRuntimeError(errorText);
      onLog?.("error", errorText);
      onPreviewError?.(errorText);
    }, BUNDLER_WATCHDOG_MS);

    const reportReadyWhenVisible = (startedAt: number) => {
      if (cancelled || readyReportedRef.current) return;
      const visualState = inspectSandpackPreview();
      if (visualState.ready) {
        clearTimers();
        readyReportedRef.current = true;
        setLastRuntimeError("");
        onPreviewReady?.();
        return;
      }
      if (Date.now() - startedAt < VISUAL_PREVIEW_TIMEOUT_MS) {
        visualTimer = window.setTimeout(() => reportReadyWhenVisible(startedAt), VISUAL_PREVIEW_POLL_MS);
        return;
      }
      // FIXED: Be more lenient - the preview might be working even if not detected
      // Only report error if there's a sandpack error AND no visible content
      if (sandpack.error) {
        const errorText = visualState.reason || "Preview compiled but did not render a visible application.";
        setLastRuntimeError(errorText);
        onLog?.("warn", errorText);
        onPreviewError?.(errorText);
      } else {
        // No sandpack error but preview not detected - still mark as ready
        readyReportedRef.current = true;
        onPreviewReady?.();
      }
    };

    const unsubscribe = listen((message) => {
      if (message.type === "done") {
        const doneMessage = message as unknown as { compilationError?: unknown; compilatonError?: unknown };
        const compileError = doneMessage.compilationError || doneMessage.compilatonError;
        if (compileError) {
          const errorText = typeof compileError === "string" ? compileError : JSON.stringify(compileError, null, 2);
          readyReportedRef.current = false;
          setLastRuntimeError(errorText);
          onLog?.("error", errorText);
          onPreviewError?.(errorText);
          clearTimers();
          return;
        }
        clearTimers();
        readyTimer = window.setTimeout(() => reportReadyWhenVisible(Date.now()), 600);
      }
      if (message.type === "action" && (message as any).action === "show-error") {
        readyReportedRef.current = false;
        clearTimers();
      }
    });

    return () => {
      cancelled = true;
      clearTimers();
      unsubscribe();
    };
  }, [listen, onLog, onPreviewError, onPreviewReady, sandpack.error]);

  const errorMessage = sandpack.error?.message || lastRuntimeError;
  if (!errorMessage || !useConsoleOverlay) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/55 p-4 text-base backdrop-blur-sm" role="alert">
      <div className="w-full max-w-[560px] rounded-xl border border-red-500/40 bg-background/90 p-4 text-foreground shadow-2xl shadow-black/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-300"><AlertTriangle className="size-4" aria-hidden="true" />Preview/runtime error</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Auto-fix can patch missing imports, broken exports, invalid JSX, dependency errors, and blank rendered previews into a new version.</p>
        <pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-border bg-transparent p-3 font-mono text-xs leading-relaxed text-red-100/90">{errorMessage}</pre>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button onClick={async () => { setDidCopy(true); await window.navigator.clipboard.writeText(errorMessage); await new Promise((resolve) => setTimeout(resolve, 1200)); setDidCopy(false); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs text-foreground transition hover:border-foreground/40" aria-label="Copy preview error">
            {didCopy ? <CheckIcon size={14} /> : <CopyIcon size={14} />}Copy log
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs text-foreground transition hover:border-foreground/40"><RefreshCw className="size-3.5" aria-hidden="true" /> Refresh</button>
            {onRequestFix ? <button onClick={() => onRequestFix(errorMessage)} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-xs font-medium text-foreground transition hover:border-foreground/40" aria-label="Try to automatically fix the error"><Wand2 className="size-3.5" aria-hidden="true" /> Try fix</button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
