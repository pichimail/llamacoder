"use client";

import { ArrowUpRight, Check, Layers, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckpointVersion {
  id: string;
  version: number;
  label: string;
}

/**
 * Replaces the Accordion-based checkpoint list previously inside chat-panel.tsx
 * with a flat, always-visible timeline: each version, the current one clearly
 * marked, a "Restore" action wired straight to the existing
 * onSwitchVersion/handleSwitchVersion handler, and an "Iterate from this
 * checkpoint" action that only switches the active version and focuses the
 * composer — it deliberately does NOT build its own prompt text. The
 * "Iterate on the existing application checkpoint: <label>" prefix is added
 * automatically by useChatComposer's handleSend whenever
 * `versions.length > 0 && currentVersionId` is set, so switching the active
 * version here is sufficient to route the next message through that existing
 * mechanism without duplicating the prompt logic.
 */
export function CheckpointTimeline({
  versions,
  currentVersionId,
  onRestore,
  onIterate,
  className,
}: {
  versions: CheckpointVersion[];
  currentVersionId?: string;
  onRestore: (id: string) => void;
  onIterate: (id: string) => void;
  className?: string;
}) {
  if (versions.length === 0) return null;
  const ordered = versions.slice().reverse();

  return (
    <div className={cn("px-3 py-2", className)} aria-label="Checkpoint timeline">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Layers className="size-3.5" aria-hidden="true" />
        Checkpoints
        <span className="ml-auto normal-case tracking-normal text-muted-foreground/70">{versions.length}</span>
      </div>
      <ol className="relative space-y-1.5 border-l border-border/60 pl-3">
        {ordered.map((version) => {
          const isCurrent = version.id === currentVersionId;
          return (
            <li key={version.id} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[19px] top-3 size-2.5 rounded-full border-2 border-background",
                  isCurrent ? "bg-emerald-400" : "bg-muted-foreground/40",
                )}
              />
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition",
                  isCurrent
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 hover:border-border hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    {version.label}
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                        <Check className="size-2.5" aria-hidden="true" /> current
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">Version {version.version}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onIterate(version.id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    title="Iterate from this checkpoint"
                  >
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Iterate</span>
                  </button>
                  {!isCurrent ? (
                    <button
                      type="button"
                      onClick={() => onRestore(version.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      title="Restore this checkpoint"
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Restore</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
