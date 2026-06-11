"use client";

import CloseIcon from "@/components/icons/close-icon";
import { RefreshCw as RefreshIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  extractAllCodeBlocks,
} from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import type { Chat, Message } from "./page";
import dynamic from "next/dynamic";
import type { PreviewMode } from "@/components/code-runner-react";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});

export default function CodeViewer({
  chat,
  streamText,
  message,
  onMessageChange,
  activeTab,
  onTabChange,
  onClose,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  autoFixEnabled,
  onAutoFixEnabledChange,
  autoFixAttempt,
  autoFixStatus,
  onRestore,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  onMessageChange: (v: Message) => void;
  activeTab: string;
  onTabChange: (v: "code" | "preview") => void;
  onClose: () => void;
  onRequestFix: (e: string) => void;
  onPreviewError: (e: string) => void;
  onPreviewReady: () => void;
  autoFixEnabled: boolean;
  onAutoFixEnabledChange: (enabled: boolean) => void;
  autoFixAttempt: number;
  autoFixStatus: "idle" | "watching" | "fixing" | "fallback" | "ready";
  onRestore: (
    message: Message | undefined,
    oldVersion: number,
    newVersion: number,
  ) => void;
}) {
  const streamAllFiles = extractAllCodeBlocks(streamText);

  const currentFiles = useMemo(() => {
    if (!message) return streamAllFiles;
    return (message.files as any[]) || extractAllCodeBlocks(message.content);
  }, [message, streamAllFiles]);

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const previewMode: PreviewMode = "web";

  useEffect(() => {
    if (currentFiles.length > 0 && !selectedFilePath) {
      setSelectedFilePath(currentFiles[0].path);
    }
  }, [currentFiles, selectedFilePath]);

  const selectedFile = currentFiles.find((f: any) => f.path === selectedFilePath) || currentFiles[0];

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-foreground overflow-hidden">
      {/* Top bar - Code / Preview + advanced controls exactly like the screenshot */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-zinc-900 px-3 text-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange("code")}
            className={`px-4 py-1 text-xs font-medium rounded-md transition ${activeTab === "code" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
          >
            Code
          </button>
          <button
            onClick={() => onTabChange("preview")}
            className={`px-4 py-1 text-xs font-medium rounded-md transition ${activeTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={() => setRefresh(r => r + 1)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <RefreshIcon className="size-3.5" /> Refresh
          </button>
          <button 
            onClick={() => toast({ title: "Download", description: "All files as zip" })}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            Download
          </button>
          <button 
            onClick={() => window.open(`/chats/${chat.id}?fs=1&preview=1`, "_blank")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            Share
          </button>
          <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-white">
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Body: Files sidebar + main (Code or Preview) exactly like the screenshot */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Files list - left of right pane */}
        {activeTab === "code" && currentFiles.length > 0 && (
          <div className="w-48 border-r border-border bg-zinc-900/50 overflow-auto text-xs py-2 flex-shrink-0">
            <div className="px-3 pb-2 text-[10px] uppercase text-muted-foreground tracking-widest">Files</div>
            {currentFiles.map((file: any, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedFilePath(file.path)}
                className={`w-full text-left px-3 py-1 flex items-center gap-2 hover:bg-zinc-800 transition ${selectedFilePath === file.path ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
              >
                <span className="text-emerald-400">📄</span>
                <span className="font-mono text-[11px] truncate">{file.path}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeTab === "preview" ? (
            <div className="flex-1 bg-white overflow-hidden">
              <CodeRunner
                key={refresh}
                files={currentFiles.length > 0 ? currentFiles : streamAllFiles}
                onPreviewError={onPreviewError}
                onPreviewReady={onPreviewReady}
                previewMode={previewMode}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-zinc-950 font-mono text-sm">
              {selectedFile ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    {selectedFile.path} <span className="text-emerald-400">({selectedFile.language})</span>
                  </div>
                  <pre className="text-[13px] leading-relaxed overflow-auto bg-black/80 p-4 rounded border border-zinc-800"><code>{selectedFile.code}</code></pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No files generated yet.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar with advanced controls exactly like the screenshot */}
      <div className="h-8 shrink-0 border-t border-border bg-zinc-900 flex items-center px-3 text-[11px] gap-4 text-muted-foreground">
        <button className="hover:text-white">Share</button>
        <button onClick={() => setRefresh(r => r + 1)} className="hover:text-white">Refresh</button>
        <button onClick={() => toast({ title: "Download", description: "Zip ready" })} className="hover:text-white">Download</button>
        <div className="flex-1" />
        <div className="text-emerald-400">● Live</div>
      </div>
    </div>
  );
}
