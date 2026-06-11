"use client";

import {
  RefreshCw as RefreshIcon,
  Download as DownloadIcon,
  Share2 as ShareIcon,
  FileCode2,
  Wand2,
  CheckCircle2,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks } from "@/lib/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { Chat, Message } from "./page";
import dynamic from "next/dynamic";
import type { PreviewMode } from "@/components/code-runner-react";
import { Switch } from "@/components/ui/switch";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});

const SyntaxHighlighter = dynamic(
  () => import("@/components/syntax-highlighter"),
  { ssr: false },
);

type ViewerFile = { path: string; code: string; language: string };

export type AutoFixStatus =
  | "idle"
  | "watching"
  | "fixing"
  | "fallback"
  | "ready";

export async function downloadFilesAsZip(
  files: Array<{ path: string; code: string }>,
  zipName: string,
) {
  if (files.length === 0) {
    toast({
      title: "Nothing to download",
      description: "No generated files yet.",
      variant: "destructive",
    });
    return;
  }
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) {
      const safePath = file.path.replace(/^\/+/, "") || "App.tsx";
      zip.file(safePath, file.code ?? "");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${zipName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "app"}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast({
      title: "Download started",
      description: `${files.length} file${files.length === 1 ? "" : "s"} zipped.`,
    });
  } catch (err) {
    console.error("Zip download failed:", err);
    toast({
      title: "Download failed",
      description: err instanceof Error ? err.message : "Could not build zip",
      variant: "destructive",
    });
  }
}

function AutoFixStatusBadge({
  status,
  attempt,
}: {
  status: AutoFixStatus;
  attempt: number;
}) {
  if (status === "idle") return null;

  const config: Record<
    Exclude<AutoFixStatus, "idle">,
    { label: string; className: string; spinning?: boolean }
  > = {
    watching: {
      label: "Watching preview",
      className: "text-muted-foreground",
    },
    fixing: {
      label: `Auto-fixing (attempt ${Math.min(attempt, 3)}/3)`,
      className: "text-amber-500",
      spinning: true,
    },
    fallback: {
      label: "Rebuilding from scratch",
      className: "text-orange-500",
      spinning: true,
    },
    ready: {
      label: "Preview healthy",
      className: "text-emerald-500",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${c.className}`}
      role="status"
      aria-live="polite"
    >
      {c.spinning ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : status === "ready" ? (
        <CheckCircle2 className="size-3" aria-hidden="true" />
      ) : (
        <Eye className="size-3" aria-hidden="true" />
      )}
      {c.label}
    </span>
  );
}

export default function CodeViewer({
  chat,
  streamText,
  message,
  activeTab,
  onTabChange,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  autoFixEnabled,
  onAutoFixEnabledChange,
  autoFixAttempt,
  autoFixStatus,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  onMessageChange?: (v: Message) => void;
  activeTab: string;
  onTabChange: (v: "code" | "preview") => void;
  onClose?: () => void;
  onRequestFix: (e: string) => void;
  onPreviewError: (e: string) => void;
  onPreviewReady: () => void;
  autoFixEnabled: boolean;
  onAutoFixEnabledChange: (enabled: boolean) => void;
  autoFixAttempt: number;
  autoFixStatus: AutoFixStatus;
  onRestore?: (
    message: Message | undefined,
    oldVersion: number,
    newVersion: number,
  ) => void;
}) {
  const streamAllFiles = useMemo(
    () => extractAllCodeBlocks(streamText),
    [streamText],
  );

  const currentFiles: ViewerFile[] = useMemo(() => {
    if (!message) return streamAllFiles;
    const stored = message.files as ViewerFile[] | null;
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    return extractAllCodeBlocks(message.content);
  }, [message, streamAllFiles]);

  // CRITICAL: the Sandpack pipeline expects { path, content } — our files carry { path, code }.
  const runnerFiles = useMemo(
    () =>
      currentFiles.map((f) => ({
        path: f.path,
        content: f.code ?? (f as any).content ?? "",
      })),
    [currentFiles],
  );

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const previewMode: PreviewMode = "web";

  // Reset / clamp file selection whenever the active version's file set changes
  useEffect(() => {
    if (currentFiles.length === 0) {
      setSelectedFilePath(null);
      return;
    }
    setSelectedFilePath((prev) =>
      prev && currentFiles.some((f) => f.path === prev)
        ? prev
        : currentFiles[0].path,
    );
  }, [currentFiles]);

  const selectedFile =
    currentFiles.find((f) => f.path === selectedFilePath) || currentFiles[0];

  const handleDownload = useCallback(() => {
    void downloadFilesAsZip(currentFiles, chat.title || "app");
  }, [currentFiles, chat.title]);

  const handleShare = useCallback(async () => {
    if (!message) {
      toast({
        title: "Nothing to share yet",
        description: "Generate a version first, then share it.",
        variant: "destructive",
      });
      return;
    }
    const url = `${window.location.origin}/share/v2/${message.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Share link copied",
        description: "Anyone with the link can view this version.",
      });
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [message]);

  const isStreaming = !!streamText;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar: Code / Preview tabs + controls */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3 text-sm">
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="Output view"
        >
          <button
            role="tab"
            id="tab-code"
            aria-selected={activeTab === "code"}
            aria-controls="panel-code"
            onClick={() => onTabChange("code")}
            className={`rounded-md px-4 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
              activeTab === "code"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            Code
          </button>
          <button
            role="tab"
            id="tab-preview"
            aria-selected={activeTab === "preview"}
            aria-controls="panel-preview"
            onClick={() => onTabChange("preview")}
            className={`rounded-md px-4 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
              activeTab === "preview"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Auto-fix toggle: enables the self-healing loop wired in page.client */}
          <label
            className="flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition hover:text-foreground"
            title="Automatically send preview errors back to the AI until the preview works"
          >
            <Wand2 className="size-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Auto-fix</span>
            <Switch
              checked={autoFixEnabled}
              onCheckedChange={onAutoFixEnabledChange}
              aria-label="Toggle automatic error fixing"
            />
          </label>

          <AutoFixStatusBadge status={autoFixStatus} attempt={autoFixAttempt} />

          <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

          <button
            onClick={() => setRefresh((r) => r + 1)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Refresh preview"
          >
            <RefreshIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">Refresh</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Download all files as a zip"
          >
            <DownloadIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">Download</span>
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Copy share link for this version"
          >
            <ShareIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Body: files sidebar (code tab) + main panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === "code" && currentFiles.length > 0 && (
          <nav
            className="w-52 flex-shrink-0 overflow-auto border-r border-border bg-card/50 py-2 text-xs"
            aria-label="Generated files"
          >
            <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Files ({currentFiles.length})
            </div>
            <ul>
              {currentFiles.map((file) => (
                <li key={file.path}>
                  <button
                    onClick={() => setSelectedFilePath(file.path)}
                    aria-current={
                      selectedFilePath === file.path ? "true" : undefined
                    }
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                      selectedFilePath === file.path
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <FileCode2
                      className="size-3.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="truncate font-mono text-[11px]">
                      {file.path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeTab === "preview" ? (
            <div
              id="panel-preview"
              role="tabpanel"
              aria-labelledby="tab-preview"
              className="flex-1 overflow-hidden bg-background"
            >
              {runnerFiles.length > 0 ? (
                <CodeRunner
                  key={refresh}
                  files={runnerFiles}
                  onRequestFix={onRequestFix}
                  onPreviewError={onPreviewError}
                  onPreviewReady={onPreviewReady}
                  previewMode={previewMode}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  {isStreaming ? (
                    <>
                      <Loader2
                        className="size-5 animate-spin"
                        aria-hidden="true"
                      />
                      <p aria-live="polite">Generating your app…</p>
                    </>
                  ) : (
                    <p>No preview yet. Send a prompt to generate an app.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              id="panel-code"
              role="tabpanel"
              aria-labelledby="tab-code"
              className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
            >
              {selectedFile ? (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-mono">{selectedFile.path}</span>
                    <span className="text-emerald-500">
                      ({selectedFile.language})
                    </span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <SyntaxHighlighter
                      files={currentFiles.map((f) => ({
                        path: f.path,
                        content: f.code ?? "",
                        language: f.language,
                      }))}
                      activePath={selectedFile.path}
                      isStreaming={isStreaming}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No files generated yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-card px-3 text-[11px] text-muted-foreground">
        <span>
          {currentFiles.length} file{currentFiles.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        <span
          className={
            isStreaming
              ? "inline-flex items-center gap-1 text-amber-500"
              : "inline-flex items-center gap-1 text-emerald-500"
          }
          aria-live="polite"
        >
          <span aria-hidden="true">●</span>
          {isStreaming ? "Generating" : "Live"}
        </span>
      </div>
    </div>
  );
}
