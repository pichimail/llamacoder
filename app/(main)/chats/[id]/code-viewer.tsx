"use client";

import { CheckCircle2, Code2, Database, Download, Eye, FileCode2, Loader2, Palette, RefreshCw, Save, Wand2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, parseReplySegments } from "@/lib/utils";
import type { Chat, Message } from "./page";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });
const CodeEditor = dynamic(() => import("@/components/code-editor"), { ssr: false });

type ViewerFile = { path: string; code: string; language: string; isPartial?: boolean };
type ArtifactTab = "code" | "preview" | "design" | "database";

export type AutoFixStatus = "idle" | "watching" | "fixing" | "fallback" | "ready";

export async function downloadFilesAsZip(files: Array<{ path: string; code: string }>, zipName: string) {
  if (files.length === 0) {
    toast({ title: "Nothing to download", description: "No generated files yet.", variant: "destructive" });
    return;
  }

  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) zip.file(file.path.replace(/^\/+/, "") || "App.tsx", file.code ?? "");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${zipName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "app"}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast({ title: "Download started" });
  } catch (error) {
    toast({ title: "Download failed", description: error instanceof Error ? error.message : "Could not build zip", variant: "destructive" });
  }
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
  onSaveFiles,
  autoFixEnabled,
  onAutoFixEnabledChange,
  autoFixAttempt,
  autoFixStatus,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  activeTab: string;
  onTabChange: (value: any) => void;
  onRequestFix: (error: string) => void;
  onPreviewError: (error: string) => void;
  onPreviewReady: () => void;
  onSaveFiles: (files: ViewerFile[]) => void;
  autoFixEnabled: boolean;
  onAutoFixEnabledChange: (enabled: boolean) => void;
  autoFixAttempt: number;
  autoFixStatus: AutoFixStatus;
}) {
  const currentTab: ArtifactTab = ["code", "preview", "design", "database"].includes(activeTab) ? (activeTab as ArtifactTab) : "code";

  const streamedFiles = useMemo<ViewerFile[]>(() => parseReplySegments(streamText)
    .filter((segment) => segment.type === "file")
    .map((segment) => ({ path: segment.path, code: segment.code, language: segment.language, isPartial: segment.isPartial })), [streamText]);

  const files = useMemo<ViewerFile[]>(() => {
    if (!message) return streamedFiles;
    const stored = message.files as ViewerFile[] | null;
    const existing = stored && Array.isArray(stored) && stored.length > 0 ? stored : extractAllCodeBlocks(message.content);
    if (streamedFiles.length === 0) return existing;
    const map = new Map<string, ViewerFile>();
    existing.forEach((file) => map.set(file.path, file));
    streamedFiles.forEach((file) => map.set(file.path, file));
    return Array.from(map.values());
  }, [message, streamedFiles]);

  const [draft, setDraft] = useState(files);
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path ?? null);
  const [dirty, setDirty] = useState(false);
  const [refresh, setRefresh] = useState(0);

  if (draft.length !== files.length && !dirty) {
    setDraft(files);
    setSelectedPath(files[0]?.path ?? null);
  }

  const selectedFile = draft.find((file) => file.path === selectedPath) ?? draft[0] ?? null;
  const runnerFiles = draft.map((file) => ({ path: file.path, content: file.code ?? "" }));
  const databaseFiles = draft.filter((file) => {
    const lower = file.path.toLowerCase();
    return lower.includes("schema.prisma") || lower.includes("migration") || lower.endsWith(".sql") || lower.includes("supabase") || lower.includes("database");
  });

  const save = () => {
    onSaveFiles(draft.filter((file) => !file.path.endsWith(".gitkeep")));
    setDirty(false);
    toast({ title: "Saved", description: "Changes stored as a new version." });
  };

  const tabs: Array<{ value: ArtifactTab; label: string; icon: React.ReactNode }> = [
    { value: "code", label: "Code", icon: <Code2 className="size-3.5" /> },
    { value: "preview", label: "Preview", icon: <Eye className="size-3.5" /> },
    { value: "design", label: "Design", icon: <Palette className="size-3.5" /> },
    { value: "database", label: "Database", icon: <Database className="size-3.5" /> },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2 text-sm">
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Artifact view">
            {tabs.map((tab) => (
              <button key={tab.value} type="button" role="tab" aria-selected={currentTab === tab.value} onClick={() => onTabChange(tab.value)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${currentTab === tab.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <AutoFixStatusBadge status={autoFixStatus} attempt={autoFixAttempt} />
            <Tip label="Auto-fix preview errors">
              <span className="inline-flex items-center gap-1.5 px-1.5">
                <Wand2 className="size-3.5 text-muted-foreground" />
                <Switch checked={autoFixEnabled} onCheckedChange={onAutoFixEnabledChange} aria-label="Toggle automatic error fixing" />
              </span>
            </Tip>
            <Tip label="Download zip">
              <button type="button" onClick={() => void downloadFilesAsZip(draft, chat.title || "app")} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Download zip">
                <Download className="size-3.5" />
              </button>
            </Tip>
            <Tip label="Refresh preview">
              <button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Refresh preview">
                <RefreshCw className="size-3.5" />
              </button>
            </Tip>
            {dirty && (
              <button type="button" onClick={save} className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground" aria-label="Save changes">
                <Save className="size-3.5" />
                Save
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {currentTab === "code" && <CodeTab files={draft} selectedFile={selectedFile} selectedPath={selectedPath} onSelect={setSelectedPath} onChange={(code) => {
            if (!selectedFile) return;
            setDraft((list) => list.map((file) => file.path === selectedFile.path ? { ...file, code } : file));
            setDirty(true);
          }} />}

          {currentTab === "preview" && <div className="min-h-0 flex-1 overflow-hidden" role="tabpanel" aria-label="Live preview">
            {runnerFiles.length > 0 ? <CodeRunner key={refresh} files={runnerFiles} onRequestFix={onRequestFix} onPreviewError={onPreviewError} onPreviewReady={onPreviewReady} previewMode="web" /> : <EmptyState isStreaming={Boolean(streamText)} />}
          </div>}

          {currentTab === "design" && <DesignTab files={draft} selectedFile={selectedFile} />}
          {currentTab === "database" && <DatabaseTab files={databaseFiles} totalFiles={draft.length} />}
        </div>

        <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
          <span>{draft.length} files</span>
          {dirty && <span className="text-amber-500">● unsaved</span>}
          <div className="flex-1" />
          <span className={streamText ? "text-amber-500" : "text-emerald-500"}>● {streamText ? "Generating" : "Live"}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function CodeTab({ files, selectedFile, selectedPath, onSelect, onChange }: { files: ViewerFile[]; selectedFile: ViewerFile | null; selectedPath: string | null; onSelect: (path: string) => void; onChange: (code: string) => void }) {
  return <>
    <nav className="hidden w-56 shrink-0 flex-col overflow-hidden border-r border-border sm:flex" aria-label="Project files">
      <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Files</div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2 text-xs">
        {files.map((file) => <button key={file.path} type="button" onClick={() => onSelect(file.path)} className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition ${selectedPath === file.path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
          <FileCode2 className="size-3.5 shrink-0" />
          <span className="truncate font-mono text-[11px]">{file.path}</span>
        </button>)}
      </div>
    </nav>
    <div className="min-w-0 flex-1 overflow-hidden">
      {selectedFile ? <CodeEditor path={selectedFile.path} value={selectedFile.code} onChange={onChange} /> : <EmptyState isStreaming={false} />}
    </div>
  </>;
}

function DesignTab({ files, selectedFile }: { files: ViewerFile[]; selectedFile: ViewerFile | null }) {
  const classCount = files.reduce((count, file) => count + (file.code.split("className=").length - 1), 0);
  return <div className="flex min-h-0 flex-1 overflow-hidden" role="tabpanel" aria-label="Design view">
    <div className="w-72 shrink-0 border-r border-border p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Artifact design</p>
      <Metric label="Files" value={String(files.length)} />
      <Metric label="Selected" value={selectedFile?.path ?? "None"} />
      <Metric label="className refs" value={String(classCount)} />
    </div>
    <div className="min-w-0 flex-1 overflow-auto p-4 text-sm text-muted-foreground">
      This view reads the current generated artifact and summarizes design structure from the same files used by Code and Preview.
    </div>
  </div>;
}

function DatabaseTab({ files, totalFiles }: { files: ViewerFile[]; totalFiles: number }) {
  return <div className="flex min-h-0 flex-1 overflow-hidden" role="tabpanel" aria-label="Database view">
    <div className="w-72 shrink-0 border-r border-border p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Artifact database</p>
      <Metric label="Schema files" value={String(files.length)} />
      <Metric label="Artifact files" value={String(totalFiles)} />
    </div>
    <div className="min-w-0 flex-1 overflow-auto p-4">
      {files.length > 0 ? files.map((file) => <div key={file.path} className="border-b border-border pb-3 mb-3">
        <p className="font-mono text-xs text-foreground">{file.path}</p>
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{file.code}</pre>
      </div>) : <p className="text-sm text-muted-foreground">No database schema files are present in this artifact yet.</p>}
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 border-b border-border pb-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 truncate font-mono text-xs text-foreground">{value}</p>
  </div>;
}

function EmptyState({ isStreaming }: { isStreaming: boolean }) {
  return <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
    {isStreaming ? <><Loader2 className="size-5 animate-spin" /><p>Generating your app...</p></> : <p>No files yet. Send a prompt to generate an app.</p>}
  </div>;
}

function AutoFixStatusBadge({ status, attempt }: { status: AutoFixStatus; attempt: number }) {
  if (status === "idle") return null;
  const label = status === "fixing" ? `Fixing ${Math.min(attempt, 3)}/3` : status === "ready" ? "Healthy" : status === "fallback" ? "Rebuilding" : "Watching";
  return <span className="hidden items-center gap-1 text-[11px] font-medium text-muted-foreground md:inline-flex" role="status" aria-live="polite">
    <CheckCircle2 className="size-3" />
    {label}
  </span>;
}
