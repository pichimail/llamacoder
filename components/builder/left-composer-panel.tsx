"use client";

import type { ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BuildActivityStrip } from "@/components/chats/build-activity";
import { ComposerDock } from "@/components/builder/composer-dock";
import { BuildWorkflowPanel, type AutoFixStatus, type ContinuationStatus } from "@/components/builder/build-workflow-panel";
import { CheckpointTimeline, type CheckpointVersion } from "@/components/builder/checkpoint-timeline";
import type { BuilderStatus } from "@/app/(main)/chats/[id]/code-viewer";
import type { Chat, Message } from "@/app/(main)/chats/[id]/page";

function isInternalUserPrompt(content: string) {
  return /Generated code validation failed before preview commit|Preview error:|Current artifact source:|The current app has errors|Apply the smallest working fix|Auto-fix mode|Return complete updated versions/i.test(content);
}

/**
 * The main left rail: a scrollable content area (conversation, live build
 * workflow status, checkpoint timeline) stacked in a column above a sticky
 * ComposerDock at the bottom. Content padding-bottom is handled by normal
 * flex layout (the dock is a sibling flex item, not an absolutely positioned
 * overlay), so streamed content is never hidden behind the input.
 *
 * This replaces both the old ChatPanel and the "full" ChatBox usage in
 * page.client.tsx — every prop here is a pass-through of state/handlers that
 * already exist on PageClient; no generation, streaming, checkpoint, or
 * auto-fix logic is reimplemented.
 */
export function LeftComposerPanel({
  chat,
  messages,
  activeMessage,
  onMessageClick,
  streamText,
  reasoningText,
  isReasoningStreaming,
  isStreaming,
  showPlanMode,
  builderStatus,
  autoFixStatus,
  autoFixAttempt,
  maxAutoFixAttempts,
  continuationStatus,
  onContinueGeneration,
  checkpoints,
  currentVersionId,
  onSwitchVersion,
  onNewStreamPromise,
  onAbortController,
  onStop,
  onUndo,
  shouldFocusInput,
  onInputFocused,
  onFocusComposer,
  composerSlotOverride,
  headerExtra,
}: {
  chat: Chat;
  messages: Message[];
  activeMessage?: Message;
  onMessageClick?: (message: Message) => void;
  streamText: string;
  reasoningText: string;
  isReasoningStreaming: boolean;
  isStreaming: boolean;
  showPlanMode: boolean;
  builderStatus: BuilderStatus;
  autoFixStatus: AutoFixStatus;
  autoFixAttempt: number;
  maxAutoFixAttempts: number;
  continuationStatus: ContinuationStatus;
  onContinueGeneration: () => void;
  checkpoints: CheckpointVersion[];
  currentVersionId?: string;
  onSwitchVersion: (id: string) => void;
  onNewStreamPromise: (
    v: Promise<ReadableStream>,
    options?: { reasoning: boolean; messageId?: string; model?: string },
  ) => void;
  onAbortController?: (c: AbortController | null) => void;
  onStop?: () => void;
  onUndo?: () => void;
  shouldFocusInput?: boolean;
  onInputFocused?: () => void;
  /** Requests the composer take keyboard focus (sets shouldFocusInput=true
   * upstream); used by the "Iterate from this checkpoint" action below. */
  onFocusComposer?: () => void;
  /** When set (Design mode), renders in place of ComposerDock — Design mode
   * portals its own typography/color/layout inspector into this slot instead
   * of showing the chat composer, exactly as the previous layout did. */
  composerSlotOverride?: ReactNode;
  /** Extra content rendered above the scrollable conversation list — used to
   * preserve the version strip / git-import stack banner / backend-setup
   * banner that previously lived directly in page.client.tsx's JSX. */
  headerExtra?: ReactNode;
}) {
  const visibleMessages = messages.filter(
    (message) => message.role !== "system" && !(message.role === "user" && isInternalUserPrompt(message.content)),
  );

  // Focus the composer AND switch the active checkpoint — the "Iterate on
  // the existing application checkpoint: <label>" prompt prefix is then
  // applied automatically by useChatComposer's handleSend, since it only
  // depends on `versions.length > 0 && currentVersionId` already being set.
  const handleIterateFromCheckpoint = (id: string) => {
    onSwitchVersion(id);
    onFocusComposer?.();
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden" aria-label="Chat and build panel">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-3 sm:px-4">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Conversation</h2>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>{visibleMessages.length} messages</span>
        </div>
      </div>

      {headerExtra}

      <BuildActivityStrip
        active={isStreaming || isReasoningStreaming}
        phase={isReasoningStreaming ? "reasoning" : "building"}
        className="mx-3 mt-2"
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-2 py-2 pb-4">
          <div className="space-y-2 px-1">
            {visibleMessages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => onMessageClick?.(message)}
                className={`w-full rounded-md border p-3 text-left text-sm transition ${
                  activeMessage?.id === message.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 size-2 shrink-0 rounded-full ${
                      message.role === "user" ? "bg-blue-400" : "bg-emerald-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{message.role}</span>
                      {message.createdAt && (
                        <span>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-foreground">{message.content.slice(0, 150)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <BuildWorkflowPanel
            builderStatus={builderStatus}
            autoFixStatus={autoFixStatus}
            autoFixAttempt={autoFixAttempt}
            maxAutoFixAttempts={maxAutoFixAttempts}
            continuationStatus={continuationStatus}
            streamText={streamText}
            reasoningText={reasoningText}
            isReasoningStreaming={isReasoningStreaming}
            isStreaming={isStreaming}
            showPlanMode={showPlanMode}
            onContinueGeneration={onContinueGeneration}
          />

          <CheckpointTimeline
            versions={checkpoints}
            currentVersionId={currentVersionId}
            onRestore={onSwitchVersion}
            onIterate={handleIterateFromCheckpoint}
          />
        </div>
      </ScrollArea>

      {composerSlotOverride ?? (
        <ComposerDock
          chat={chat}
          onNewStreamPromise={onNewStreamPromise}
          onAbortController={onAbortController}
          isStreaming={isStreaming}
          onStop={onStop}
          onUndo={onUndo}
          versions={checkpoints}
          currentVersionId={currentVersionId}
          onSwitchVersion={onSwitchVersion}
          shouldFocusInput={shouldFocusInput}
          onInputFocused={onInputFocused}
        />
      )}
    </section>
  );
}
