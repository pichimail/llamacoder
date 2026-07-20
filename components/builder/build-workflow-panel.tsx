"use client";

import { AlertCircle, CheckCircle2, Loader2, Wrench } from "lucide-react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task";
import { PlanResponseCard } from "@/components/plan-mode-panel";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderStatus } from "@/app/(main)/chats/[id]/code-viewer";

export type AutoFixStatus = "idle" | "watching" | "fixing" | "fallback" | "ready";
export type ContinuationStatus = "idle" | "continuing" | "exhausted";

const BUILD_STATUS_LABEL: Record<BuilderStatus, string> = {
  generating: "Generating code…",
  fixing: "Applying a fix…",
  rebuilding: "Rebuilding the app…",
  validating: "Validating the build…",
  ready: "Build is ready",
  failed: "Build needs attention",
};

function StatusPill({ status }: { status: BuilderStatus }) {
  const busy = status === "generating" || status === "fixing" || status === "rebuilding" || status === "validating";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "ready" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
        status === "failed" && "border-destructive/30 bg-destructive/10 text-destructive",
        busy && "border-border/60 bg-muted/40 text-foreground",
      )}
      role="status"
      aria-live="polite"
    >
      {busy ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
      {status === "ready" ? <CheckCircle2 className="size-3" aria-hidden="true" /> : null}
      {status === "failed" ? <AlertCircle className="size-3" aria-hidden="true" /> : null}
      {busy ? <Shimmer as="span" duration={1.4}>{BUILD_STATUS_LABEL[status]}</Shimmer> : BUILD_STATUS_LABEL[status]}
    </div>
  );
}

/**
 * Shows plan/task progress, the live reasoning stream, and build / auto-fix /
 * continuation status while a generation is in flight (or just finished).
 * Purely presentational: every action it exposes (Continue) calls back into
 * the handlers already owned by page.client.tsx — it never starts or manages
 * a generation itself.
 */
export function BuildWorkflowPanel({
  builderStatus,
  autoFixStatus,
  autoFixAttempt,
  maxAutoFixAttempts,
  continuationStatus,
  streamText,
  reasoningText,
  isReasoningStreaming,
  isStreaming,
  showPlanMode,
  onContinueGeneration,
  className,
}: {
  builderStatus: BuilderStatus;
  autoFixStatus: AutoFixStatus;
  autoFixAttempt: number;
  maxAutoFixAttempts: number;
  continuationStatus: ContinuationStatus;
  streamText: string;
  reasoningText: string;
  isReasoningStreaming: boolean;
  isStreaming: boolean;
  showPlanMode: boolean;
  onContinueGeneration: () => void;
  className?: string;
}) {
  const hasReasoning = reasoningText.length > 0 || isReasoningStreaming;
  const showWorkflow = isStreaming || isReasoningStreaming || builderStatus !== "ready" || continuationStatus === "exhausted";

  if (!showWorkflow) return null;

  const tasks = isStreaming
    ? [
        { id: "1", title: "Analyzing requirements", status: "completed" as const, description: "Understanding the request" },
        { id: "2", title: "Generating code structure", status: (autoFixStatus === "fixing" ? "completed" : "in-progress") as "completed" | "in-progress", description: "Writing files" },
        { id: "3", title: "Validating build", status: (autoFixStatus === "fixing" ? "in-progress" : "pending") as "in-progress" | "pending", description: "Compiling and checking the preview" },
      ]
    : [];

  return (
    <div className={cn("space-y-3 px-3 py-2", className)} aria-label="Build workflow status">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={builderStatus} />
        {autoFixStatus === "fixing" && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
            <Wrench className="size-3" aria-hidden="true" />
            Auto-fix attempt {autoFixAttempt}/{maxAutoFixAttempts}
          </div>
        )}
        {continuationStatus === "continuing" && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-500">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Continuing generation…
          </div>
        )}
      </div>

      {continuationStatus === "exhausted" && !isStreaming && (
        <Alert variant="destructive" className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <AlertTitle className="text-sm">Generation was interrupted</AlertTitle>
              <AlertDescription className="text-xs">
                This build needed more room than usual to finish. Your progress was saved — click Continue to pick up exactly where it left off.
              </AlertDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={onContinueGeneration}>
            Continue
          </Button>
        </Alert>
      )}

      {hasReasoning && (
        <Reasoning isStreaming={isReasoningStreaming} className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText || "…"}</ReasoningContent>
        </Reasoning>
      )}

      {showPlanMode && (
        <PlanResponseCard
          content={streamText || "Plan will appear here when you use Plan mode."}
          isStreaming={isStreaming}
          className="rounded-lg border-border/50 bg-muted/20"
        />
      )}

      {tasks.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border/50 bg-muted/10 p-2">
          {tasks.map((task) => (
            <Task key={task.id} defaultOpen={task.status !== "completed"}>
              <TaskTrigger title={task.title}>
                <div className="flex w-full items-center gap-2 text-sm">
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      task.status === "completed" ? "bg-emerald-400" : task.status === "in-progress" ? "bg-amber-400 animate-pulse" : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-foreground">{task.title}</span>
                  {task.status === "in-progress" && <span className="ml-auto text-[10px] text-amber-400">in progress</span>}
                </div>
              </TaskTrigger>
              {task.description && (
                <TaskContent>
                  <TaskItem>{task.description}</TaskItem>
                </TaskContent>
              )}
            </Task>
          ))}
        </div>
      )}
    </div>
  );
}
