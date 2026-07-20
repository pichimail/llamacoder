"use client";

import { useEffect } from "react";
import { Bookmark, RotateCcw } from "lucide-react";
import { PromptComposer } from "@/components/chat/prompt-composer";
import { AiModalAbilitySelector } from "@/components/ui/ai-modal-ability-selector";
import { AiSuggestions } from "@/components/ui/ai-suggestions";
import { Button } from "@/components/ui/button";
import { useChatComposer } from "@/components/chat/use-chat-composer";
import { cn } from "@/lib/utils";
import type { Chat } from "@/app/(main)/chats/[id]/page";

/**
 * Sticky bottom dock for the left composer rail: swipeable suggestion chips,
 * the checkpoint/undo status row, and the prompt input itself. Submit
 * behavior (model persistence, mode prefixes, git-import detection, the
 * "iterate on checkpoint" prompt prefix) is delegated to `useChatComposer`
 * — the exact same hook the legacy floating ChatBox uses — so nothing about
 * how a message is built or sent is reimplemented here.
 */
export function ComposerDock({
  chat,
  onNewStreamPromise,
  onAbortController,
  isStreaming,
  onStop,
  onUndo,
  versions = [],
  currentVersionId,
  shouldFocusInput,
  onInputFocused,
  className,
}: {
  chat: Chat;
  onNewStreamPromise: (
    v: Promise<ReadableStream>,
    options?: { reasoning: boolean; messageId?: string; model?: string },
  ) => void;
  onAbortController?: (c: AbortController | null) => void;
  isStreaming: boolean;
  onStop?: () => void;
  onUndo?: () => void;
  versions?: { id: string; version: number; label: string }[];
  currentVersionId?: string;
  onSwitchVersion?: (id: string) => void;
  shouldFocusInput?: boolean;
  onInputFocused?: () => void;
  className?: string;
}) {
  const {
    prompt,
    setPrompt,
    model,
    modelOptions,
    mode,
    cycleMode,
    abilityModalOpen,
    setAbilityModalOpen,
    setActiveAbilities,
    disabled,
    composerRef,
    handleModelChange,
    handleSend,
    activeCheckpoint,
  } = useChatComposer({
    chat,
    onNewStreamPromise,
    onAbortController,
    isStreaming,
    versions,
    currentVersionId,
    allowGitImport: true,
  });

  useEffect(() => {
    if (!shouldFocusInput) return;
    const textarea = composerRef.current?.querySelector("textarea");
    textarea?.focus();
    onInputFocused?.();
  }, [composerRef, onInputFocused, shouldFocusInput]);

  return (
    <div
      ref={composerRef}
      className={cn(
        "chat-composer sticky bottom-0 z-10 shrink-0 border-t border-border/70 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur",
        className,
      )}
    >
      {versions.length > 0 || onUndo ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <Bookmark className="size-3.5 shrink-0 text-lime-200" aria-hidden="true" />
            <span className="truncate">{activeCheckpoint?.label ?? "No checkpoint yet"}</span>
            {versions.length > 1 ? (
              <span className="shrink-0 text-muted-foreground/60">· {versions.length} versions</span>
            ) : null}
          </div>
          {onUndo ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={disabled}
              className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Undo
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mb-2.5 -mx-1 px-1">
        <AiSuggestions onSelect={(value) => setPrompt(value)} />
      </div>

      <div className="group/composer relative">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-[2px] rounded-[18px] bg-[linear-gradient(135deg,rgba(190,242,100,0.44),rgba(251,191,36,0.14),rgba(255,255,255,0.06))] opacity-0 blur-[7px] transition-opacity duration-500 group-focus-within/composer:opacity-75",
            isStreaming && "animate-pulse opacity-70",
          )}
        />
        <div className="relative rounded-[20px] border border-lime-300/10 bg-[#080a07]/95 p-1 shadow-2xl shadow-black/30">
          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSend={handleSend}
            onStop={onStop}
            status={isStreaming ? "streaming" : disabled ? "submitted" : "ready"}
            placeholder="Describe the next app build, fix, integration, or preview change..."
            disabled={disabled}
            mode={mode}
            onModeChange={cycleMode}
            onOpenAbilities={() => setAbilityModalOpen(true)}
            model={model}
            modelOptions={modelOptions}
            onModelChange={handleModelChange}
            onDictate={(text) => setPrompt((current) => `${current}${current.trim() ? " " : ""}${text}`)}
          />
        </div>
      </div>

      <AiModalAbilitySelector
        open={abilityModalOpen}
        onOpenChange={setAbilityModalOpen}
        onSelect={(ability) => {
          setActiveAbilities((current) => Array.from(new Set([...current, ability])));
          if (ability === "backend") {
            setPrompt((current) => current || "Build a backend-ready app with database, auth, API routes, and admin controls.");
          }
        }}
      />
    </div>
  );
}
