"use client";

import { useEffect, type ReactNode } from "react";
import {
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  GitPullRequest,
  History,
  Home,
  Monitor,
  Palette,
  RefreshCw,
  Share2,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { PreviewMode } from "@/components/code-runner-react";

type BuilderMode = "preview" | "code" | "design" | "database";

interface ChatsContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  canAct: boolean;
  fileCount: number;
  activeVersionLabel?: string;
  autoFixEnabled: boolean;
  previewMode: PreviewMode;
  onClose: () => void;
  onNewChat: () => void;
  onCopyUrl: () => void;
  onShare: () => void;
  onPublish: () => void;
  onDownload: () => void;
  onCreatePr: () => void;
  onPreviousVersion: () => void;
  onToggleAutoFix: () => void;
  onSwitchMode: (mode: BuilderMode) => void;
  onTogglePreviewMode: () => void;
}

export function ChatsContextMenu({
  open,
  x,
  y,
  canAct,
  fileCount,
  activeVersionLabel,
  autoFixEnabled,
  previewMode,
  onClose,
  onNewChat,
  onCopyUrl,
  onShare,
  onPublish,
  onDownload,
  onCreatePr,
  onPreviousVersion,
  onToggleAutoFix,
  onSwitchMode,
  onTogglePreviewMode,
}: ChatsContextMenuProps) {
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const left = Math.min(x, Math.max(12, window.innerWidth - 286));
  const top = Math.min(y, Math.max(12, window.innerHeight - 430));

  const run = (fn: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    fn();
    onClose();
  };

  return (
    <div
      role="menu"
      aria-label="Chats workspace menu"
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-[80] w-[274px] overflow-hidden rounded-xl border border-border/70 bg-[#171717]/95 p-1.5 text-sm text-foreground shadow-2xl shadow-black/35 backdrop-blur"
      style={{ left, top }}
    >
      <div className="px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
        <p className="font-medium text-foreground">{activeVersionLabel || "No version selected"}</p>
        <p>{fileCount} artifact file{fileCount === 1 ? "" : "s"}</p>
      </div>

      <MenuSection>
        <MenuItem icon={<Home className="size-4" />} label="New chat" shortcut="⌘N" onClick={run(onNewChat)} />
        <MenuItem icon={<Copy className="size-4" />} label="Copy chat URL" shortcut="⌘L" onClick={run(onCopyUrl)} />
        <MenuItem icon={<History className="size-4" />} label="Revert previous version" disabled={!canAct} onClick={run(onPreviousVersion)} />
      </MenuSection>

      <MenuSection>
        <MenuItem icon={<Eye className="size-4" />} label="Preview mode" onClick={run(() => onSwitchMode("preview"))} />
        <MenuItem icon={<Code2 className="size-4" />} label="Code mode" onClick={run(() => onSwitchMode("code"))} />
        <MenuItem icon={<Palette className="size-4" />} label="Design mode" onClick={run(() => onSwitchMode("design"))} />
        <MenuItem icon={<Database className="size-4" />} label="Database mode" onClick={run(() => onSwitchMode("database"))} />
        <MenuItem
          icon={previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
          label={`Switch to ${previewMode === "web" ? "mobile" : "web"} preview`}
          onClick={run(onTogglePreviewMode)}
        />
      </MenuSection>

      <MenuSection>
        <MenuItem icon={<Share2 className="size-4" />} label="Copy share link" disabled={!canAct} onClick={run(onShare)} />
        <MenuItem icon={<ExternalLink className="size-4" />} label="Publish site" disabled={!canAct} onClick={run(onPublish)} />
        <MenuItem icon={<Download className="size-4" />} label="Download ZIP" disabled={!canAct} onClick={run(onDownload)} />
        <MenuItem icon={<GitPullRequest className="size-4" />} label="Create PR" disabled={!canAct} onClick={run(onCreatePr)} />
      </MenuSection>

      <MenuSection last>
        <MenuItem
          icon={autoFixEnabled ? <RefreshCw className="size-4" /> : <Wand2 className="size-4" />}
          label={autoFixEnabled ? "Auto-fix enabled" : "Enable auto-fix"}
          trailing={autoFixEnabled ? "On" : "Off"}
          onClick={run(onToggleAutoFix)}
        />
        <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5" />
          <span>Actions are wired to the current chat backend.</span>
        </div>
      </MenuSection>
    </div>
  );
}

function MenuSection({ children, last }: { children: ReactNode; last?: boolean }) {
  return <div className={last ? "py-1" : "border-b border-border/60 py-1"}>{children}</div>;
}

function MenuItem({ icon, label, shortcut, trailing, disabled, onClick }: { icon: ReactNode; label: string; shortcut?: string; trailing?: string; disabled?: boolean; onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <span className="font-mono text-[10px] text-muted-foreground">{shortcut}</span>}
      {trailing && <span className="rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">{trailing}</span>}
    </button>
  );
}
