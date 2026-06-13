"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getSandpackConfig } from "@/lib/sandpack-config";

export default function ReactCodeRunner({
  files,
  extraDependencies,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
}: {
  files: Array<{ path: string; content: string }>;
  extraDependencies?: Record<string, string>;
  onRequestFix?: (e: string) => void;
  onPreviewError?: (e: string) => void;
  onPreviewReady?: () => void;
}) {
  const filesKey =
    files.map((f) => f.path + f.content).join("") +
    JSON.stringify(extraDependencies || {});

  return (
    <SandpackProvider
      key={filesKey}
      className="relative h-full w-full [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:items-center [&_.sp-preview-container]:justify-center [&_.sp-preview-container]:overflow-auto [&_.sp-preview-iframe]:!w-full [&_.sp-preview-iframe]:!max-w-none [&_.sp-preview-iframe]:grow [&_.sp-preview-iframe]:!rounded-xl [&_.sp-preview-iframe]:!border [&_.sp-preview-iframe]:!border-border [&_.sp-preview-iframe]:!bg-background [&_.sp-preview-iframe]:shadow-sm"
      {...getSandpackConfig(files, extraDependencies)}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        className="h-full w-full"
      />
      <PreviewStatusMonitor
        onRequestFix={onRequestFix}
        onPreviewError={onPreviewError}
        onPreviewReady={onPreviewReady}
      />
    </SandpackProvider>
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

  // Report errors immediately
  useEffect(() => {
    if (sandpack.error) {
      onPreviewError?.(sandpack.error.message);
    }
  }, [sandpack.error, onPreviewError]);

  // Report "ready" only after the bundler actually finishes without errors,
  // debounced so a crash right after mount still counts as an error.
  useEffect(() => {
    let readyTimer: number | undefined;

    const unsubscribe = listen((message) => {
      if (message.type === "done" && !(message as any).compilatonError) {
        window.clearTimeout(readyTimer);
        readyTimer = window.setTimeout(() => {
          if (!sandpack.error) {
            onPreviewReady?.();
          }
        }, 1200);
      }
      if (message.type === "action" && (message as any).action === "show-error") {
        window.clearTimeout(readyTimer);
      }
    });

    return () => {
      window.clearTimeout(readyTimer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen, onPreviewReady]);

  if (!sandpack.error) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/70 text-base backdrop-blur-sm"
      role="alert"
    >
      <div className="max-w-[400px] rounded-md border border-border bg-destructive p-4 text-destructive-foreground shadow-xl shadow-black/20">
        <p className="text-lg font-medium">Error</p>

        <p className="mt-4 line-clamp-[10] overflow-x-auto whitespace-pre font-mono text-xs">
          {sandpack.error.message}
        </p>

        <div className="mt-8 flex justify-between gap-4">
          <button
            onClick={async () => {
              if (!sandpack.error) return;

              setDidCopy(true);
              await window.navigator.clipboard.writeText(
                sandpack.error.message,
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              setDidCopy(false);
            }}
            className="rounded border border-destructive-foreground/30 px-2.5 py-1.5 text-sm font-semibold text-destructive-foreground"
          >
            {didCopy ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
          </button>
          <button
            onClick={() => {
              if (!sandpack.error) return;
              onRequestFix?.(sandpack.error.message);
            }}
            disabled={!onRequestFix}
            className="rounded bg-background px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2"
            aria-label="Try to automatically fix the error"
          >
            Try to fix
          </button>
        </div>
      </div>
    </div>
  );
}
