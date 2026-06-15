"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Upload,
} from "lucide-react";

import {
  connectIntegration,
  createGithubPullRequest,
  getArtifactWorkspace,
  publishArtifact,
  syncArtifactFiles,
  upsertEnvironmentVariable,
} from "@/app/(main)/actions";
import { toast } from "@/hooks/use-toast";
import { Tip } from "@/components/ui/tooltip";
import type { ArtifactFile } from "@/lib/artifact-analysis";

type WorkspaceState = Awaited<ReturnType<typeof getArtifactWorkspace>>;

type VersionOption = { id: string; version: number; label: string };

interface ArtifactActionBarProps {
  chatId: string;
  chatTitle: string;
  activeMessageId?: string;
  activeVersionLabel?: string;
  versions: VersionOption[];
  files: ArtifactFile[];
  onSwitchVersion: (messageId: string) => void;
  onDownload: () => void;
}

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";
const menuItem =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45";

export function ArtifactActionBar({
  chatId,
  chatTitle,
  activeMessageId,
  activeVersionLabel,
  versions,
  files,
  onSwitchVersion,
  onDownload,
}: ArtifactActionBarProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [open, setOpen] = useState(false);
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const uploadRef = useRef<HTMLInputElement>(null);

  const canAct = !!activeMessageId && files.length > 0;

  const refreshWorkspace = () => {
    startTransition(async () => {
      try {
        const next = await getArtifactWorkspace(chatId);
        setWorkspace(next);
      } catch (error) {
        toast({
          title: "Workspace sync failed",
          description: error instanceof Error ? error.message : "Could not load project backend state.",
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncArtifactFiles(chatId, files);
      toast({ title: "Files synced", description: `${result.fileCount} files stored in the project backend.` });
      const next = await getArtifactWorkspace(chatId);
      setWorkspace(next);
    });
  };

  const handlePublish = () => {
    if (!activeMessageId) return;
    startTransition(async () => {
      const result = await publishArtifact(chatId, activeMessageId, files);
      const absoluteUrl = `${window.location.origin}${result.url}`;
      await navigator.clipboard.writeText(absoluteUrl).catch(() => undefined);
      toast({ title: "Published", description: "Live share link copied." });
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
      const next = await getArtifactWorkspace(chatId);
      setWorkspace(next);
    });
  };

  const handleShare = async () => {
    if (!activeMessageId) return;
    const url = `${window.location.origin}/share/v2/${activeMessageId}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    toast({ title: "Share link copied", description: url });
  };

  const handleConnectGithub = () => {
    startTransition(async () => {
      await connectIntegration(chatId, "github", { source: "phase-3-action-bar" });
      const next = await getArtifactWorkspace(chatId);
      setWorkspace(next);
      toast({ title: "GitHub marked connected", description: "Create PR requests now persist in the backend queue." });
    });
  };

  const handleCreatePr = () => {
    startTransition(async () => {
      const result = await createGithubPullRequest(chatId, files);
      if (!result.ok) {
        toast({ title: "GitHub not ready", description: result.reason, variant: "destructive" });
        return;
      }
      toast({ title: "PR request queued", description: `${files.length} files prepared for GitHub.` });
      const next = await getArtifactWorkspace(chatId);
      setWorkspace(next);
    });
  };

  const handleSaveEnv = () => {
    startTransition(async () => {
      await upsertEnvironmentVariable(chatId, envKey, envValue);
      setEnvKey("");
      setEnvValue("");
      const next = await getArtifactWorkspace(chatId);
      setWorkspace(next);
      toast({ title: "Environment variable saved" });
    });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { url?: string; pathname?: string };
      await navigator.clipboard.writeText(data.url || "").catch(() => undefined);
      toast({ title: "Upload complete", description: data.pathname || "Asset URL copied." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="relative flex min-w-0 items-center justify-end gap-1">
      {versions.length > 0 && (
        <label className="hidden items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground sm:flex">
          <span className="sr-only">Version</span>
          <select
            value={activeMessageId || ""}
            onChange={(event) => onSwitchVersion(event.target.value)}
            className="max-w-[110px] bg-transparent text-xs text-foreground outline-none"
            aria-label="Switch generated version"
          >
            {versions
              .slice()
              .reverse()
              .map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
          </select>
          <ChevronDown className="size-3" aria-hidden="true" />
        </label>
      )}

      <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} />

      <Tip label="Upload asset">
        <button type="button" className={iconButton} onClick={() => uploadRef.current?.click()} aria-label="Upload asset">
          <Upload className="size-4" aria-hidden="true" />
        </button>
      </Tip>
      <Tip label="Export zip">
        <button type="button" className={iconButton} onClick={onDownload} disabled={!canAct} aria-label="Export generated files">
          <Download className="size-4" aria-hidden="true" />
        </button>
      </Tip>
      <Tip label="Share link">
        <button type="button" className={iconButton} onClick={handleShare} disabled={!activeMessageId} aria-label="Copy share link">
          <Share2 className="size-4" aria-hidden="true" />
        </button>
      </Tip>
      <Tip label="Publish site">
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canAct || isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45"
          aria-label="Publish site"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">Publish</span>
        </button>
      </Tip>
      {workspace?.hasGithub && (
        <Tip label="Create pull request">
          <button type="button" className={iconButton} onClick={handleCreatePr} disabled={!canAct || isPending} aria-label="Create GitHub pull request">
            <GitPullRequest className="size-4" aria-hidden="true" />
          </button>
        </Tip>
      )}
      <Tip label="More project actions">
        <button type="button" className={iconButton} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="More project actions">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </Tip>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[320px] overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/30">
          <div className="border-b border-border px-2 pb-2 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">{chatTitle}</p>
            <p>{activeVersionLabel || "No version"} · {workspace?.fileCount ?? files.length} backend files</p>
          </div>
          <div className="py-1">
            <button type="button" className={menuItem} onClick={handleSync} disabled={!canAct || isPending}>
              <RefreshCw className="size-3.5" aria-hidden="true" /> Sync artifact files
            </button>
            <button type="button" className={menuItem} onClick={workspace?.hasGithub ? handleCreatePr : handleConnectGithub} disabled={isPending}>
              <GitPullRequest className="size-3.5" aria-hidden="true" /> {workspace?.hasGithub ? "Create PR request" : "Connect GitHub"}
            </button>
          </div>
          <div className="border-t border-border p-2">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3" aria-hidden="true" /> Env vars
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1">
              <input value={envKey} onChange={(event) => setEnvKey(event.target.value)} placeholder="KEY" className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring" />
              <input value={envValue} onChange={(event) => setEnvValue(event.target.value)} placeholder="value" className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring" />
              <button type="button" onClick={handleSaveEnv} disabled={!envKey.trim() || isPending} className="h-8 rounded-md border border-border px-2 text-xs hover:bg-accent disabled:opacity-40">
                Save
              </button>
            </div>
            <div className="mt-2 max-h-24 space-y-1 overflow-auto">
              {workspace?.envVars?.length ? (
                workspace.envVars.map((env) => (
                  <div key={env.id} className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1 text-[11px]">
                    <span className="font-mono text-foreground">{env.key}</span>
                    <span className="text-muted-foreground">{env.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">No environment variables yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
