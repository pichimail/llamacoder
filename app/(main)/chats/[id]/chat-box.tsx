"use client";

import { PromptComposer, type ComposerAttachment, type ComposerMode } from "@/components/chat/prompt-composer";
import { AiModalAbilitySelector } from "@/components/ui/ai-modal-ability-selector";
import { AiSuggestions } from "@/components/ui/ai-suggestions";
import { Button } from "@/components/ui/button";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { MODELS } from "@/lib/constants";
import { askModePrompt, planModePrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { useAvailableModels } from "@/lib/use-available-models";
import { Bookmark, Expand, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";

export default function ChatBox({
  chat,
  onNewStreamPromise,
  onAbortController,
  isStreaming,
  onStop,
  onUndo,
  versions = [],
  currentVersionId,
  onSwitchVersion,
  shouldFocusInput,
  onInputFocused,
  variant = "full",
  onExpand,
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
  variant?: "full" | "minimal";
  onExpand?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(chat.model);
  const [mode, setMode] = useState<ComposerMode>("agent");
  const [quality] = useState<"low" | "high">(chat.quality === "high" ? "high" : "low");
  const [abilityModalOpen, setAbilityModalOpen] = useState(false);
  const [activeAbilities, setActiveAbilities] = useState<string[]>(["web"]);
  const [isPending, startTransition] = useTransition();
  const composerRef = useRef<HTMLDivElement>(null);
  const availableModels = useAvailableModels();

  const disabled = isPending || isStreaming;
  const modelOptions = useMemo(
    () => (availableModels ?? MODELS.filter((item) => !item.hidden)).map((item) => ({
      label: item.label || item.value,
      value: item.value,
    })),
    [availableModels],
  );

  const activeCheckpoint = versions.find((version) => version.id === currentVersionId) ?? versions[versions.length - 1];

  useEffect(() => {
    if (!shouldFocusInput) return;
    const textarea = composerRef.current?.querySelector("textarea");
    textarea?.focus();
    onInputFocused?.();
  }, [onInputFocused, shouldFocusInput]);

  async function persistBuilderSettings(updates: { model?: string }) {
    await fetch(`/api/chats/${chat.id}/builder-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => undefined);
  }

  function handleModelChange(next: string) {
    const nextModel = modelOptions.find((item) => item.label === next || item.value === next)?.value ?? next;
    setModel(nextModel);
    void persistBuilderSettings({ model: nextModel });
  }

  function buildModePrefix() {
    if (mode === "ask") return askModePrompt.trim();
    if (mode === "plan") return planModePrompt.trim();
    return "Act as an agentic app builder. Plan briefly, update only necessary files, keep preview buildable, and ask for confirmation before integrations, secrets, destructive actions, publishing, or exports.";
  }

  function isGitHubUrl(value: string) {
    return /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(value.trim());
  }

  async function handleGitImport(url: string) {
    const response = await fetch(`/api/workspace/${chat.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-git", url }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Import failed");
    toast({
      title: "Repository imported",
      description: `${data.imported?.fileCount || 0} files are ready for bootstrap and preview.`,
    });
    window.location.reload();
  }

  function handleSend(content: string, attachments: ComposerAttachment[] = []) {
    if (disabled) return;
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    startTransition(async () => {
      try {
        if (isGitHubUrl(trimmed) && variant === "full") {
          await handleGitImport(trimmed);
          setPrompt("");
          return;
        }

        let finalPrompt = trimmed || "Use the attached files as context and update the app.";
        finalPrompt = `${buildModePrefix()}\n\nUser request:\n${finalPrompt}`;

        if (activeAbilities.length > 0) {
          finalPrompt += `\n\nSelected abilities: ${activeAbilities.join(", ")}.`;
        }

        if (attachments.length > 0) {
          finalPrompt += `\n\nAttachments:\n${attachments
            .map((attachment, index) => {
              const parts = [`${index + 1}. [${attachment.kind}] ${attachment.filename}`];
              if (attachment.size) parts.push(`${Math.round(attachment.size / 1024)} KB`);
              if (attachment.url) parts.push(attachment.url);
              return parts.join(" - ");
            })
            .join("\n")}`;
        }

        if (versions.length > 0 && currentVersionId) {
          const label = versions.find((version) => version.id === currentVersionId)?.label || "latest";
          finalPrompt = `Iterate on the existing application checkpoint: ${label}.\n\n${finalPrompt}\n\nReturn only files that need to change. Preserve working structure.`;
        }

        const controller = new AbortController();
        onAbortController?.(controller);
        const message = await createMessage(
          chat.id,
          finalPrompt,
          "user",
          attachments.length > 0 ? (attachments as unknown as Record<string, unknown>[]) : undefined,
        );

        const streamPromise = fetch("/api/get-next-completion-stream-promise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messageId: message.id,
            model,
            reasoning: mode === "agent",
            quality,
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error((await response.text()) || "Failed to start generation");
            if (!response.body) throw new Error("No body on response");
            return response.body;
          })
          .catch((error) => {
            onAbortController?.(null);
            if (error?.name === "AbortError") return null as unknown as ReadableStream;
            toast({
              title: "Generation failed",
              description: error instanceof Error ? error.message : String(error),
              variant: "destructive",
            });
            throw error;
          });

        onNewStreamPromise(streamPromise, { reasoning: mode === "agent", messageId: message.id, model });
        setPrompt("");
      } catch (error) {
        onAbortController?.(null);
        toast({
          title: "Could not send request",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <div ref={composerRef} className="w-full">
          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSend={handleSend}
            onStop={onStop}
            status={isStreaming ? "streaming" : isPending ? "submitted" : "ready"}
            placeholder="Describe a change..."
            disabled={disabled}
            leftActions={
              <Tip label="Show full composer">
                <button
                  type="button"
                  onClick={onExpand}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Show full composer"
                >
                  <Expand className="size-3.5" />
                </button>
              </Tip>
            }
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div ref={composerRef} className="relative w-full chat-composer">
        {versions.length > 0 || onUndo ? (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-1.5">
              <Bookmark className="size-3.5 shrink-0 text-lime-200" />
              <span className="truncate">{activeCheckpoint?.label ?? "No checkpoint yet"}</span>
              {versions.length > 1 ? <span className="shrink-0 text-muted-foreground/60">· {versions.length} versions</span> : null}
            </div>
            {onUndo ? (
              <Button variant="ghost" size="sm" onClick={onUndo} disabled={disabled} className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="size-3.5" />
                Undo
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
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
              status={isStreaming ? "streaming" : isPending ? "submitted" : "ready"}
              placeholder="Describe the next app build, fix, integration, or preview change..."
              disabled={disabled}
              autoFocus
              mode={mode}
              onModeChange={() => setMode((current) => (current === "agent" ? "plan" : current === "plan" ? "ask" : "agent"))}
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
            if (ability === "backend") setPrompt((current) => current || "Build a backend-ready app with database, auth, API routes, and admin controls.");
          }}
        />
      </div>
    </TooltipProvider>
  );
}
