"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe, Link2, Share2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  messageId?: string;
  shareUrl?: string;
  publishedUrl?: string;
  isPublished?: boolean;
  duplicateProtected?: boolean;
  onPublish?: () => Promise<void>;
  publishing?: boolean;
};

export function ShareDialog({
  open,
  onClose,
  title,
  messageId,
  shareUrl: shareUrlProp,
  publishedUrl,
  isPublished = false,
  duplicateProtected = false,
  onPublish,
  publishing = false,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<"share" | "publish" | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl =
    shareUrlProp ||
    (messageId ? `${origin}/share/v2/${messageId}` : "");
  const liveUrl = publishedUrl || shareUrl;

  useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  const copy = async (url: string, kind: "share" | "publish") => {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(kind);
    toast({ title: "Link copied" });
    setTimeout(() => setCopied(null), 2000);
  };

  const tweetUrl = shareUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" built with Chinna-Coder`)}&url=${encodeURIComponent(shareUrl)}`
    : "";

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-emerald-500" aria-hidden="true" />
            Share &ldquo;{title}&rdquo;
          </AlertDialogTitle>
          <AlertDialogDescription>
            Anyone with the link can view a live preview of this generation.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Link2 className="size-3.5" aria-hidden="true" />
              Preview link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => copy(shareUrl, "share")}
                disabled={!shareUrl}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-foreground transition hover:bg-accent disabled:opacity-40"
                aria-label="Copy preview link"
              >
                {copied === "share" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-foreground transition hover:bg-accent"
                  aria-label="Open preview in new tab"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Globe className="size-3.5" aria-hidden="true" />
                  Public publish
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPublished || duplicateProtected
                    ? "This version is already published. Share the link below."
                    : "Publish creates a stable public URL for this app version."}
                </p>
              </div>
              {onPublish && !isPublished && !duplicateProtected ? (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={publishing || !messageId}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  {publishing ? "Publishing…" : "Publish"}
                </button>
              ) : null}
            </div>
            {(isPublished || duplicateProtected) && liveUrl ? (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveUrl}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => copy(liveUrl, "publish")}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                >
                  {copied === "publish" ? "Copied" : "Copy"}
                </button>
              </div>
            ) : null}
          </div>

          {tweetUrl ? (
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Share on X / Twitter
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}