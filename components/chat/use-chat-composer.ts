"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "@/hooks/use-toast";
import { MODELS } from "@/lib/constants";
import { askModePrompt, planModePrompt } from "@/lib/prompts";
import { useAvailableModels } from "@/lib/use-available-models";
import { createMessage } from "@/app/(main)/actions";
import type { ComposerAttachment, ComposerMode } from "@/components/chat/prompt-composer";
import type { Chat } from "@/app/(main)/chats/[id]/page";

/**
 * Shared composer submit logic used by both the legacy floating/minimal
 * ChatBox and the new ComposerDock. Extracted verbatim from chat-box.tsx so
 * behavior (model persistence, mode prefixes, git-import detection,
 * ability tagging, attachment formatting, and the "iterate on checkpoint"
 * prompt prefix) stays identical across both surfaces — the two callers only
 * differ in presentation, never in what gets sent to the model.
 */
export function useChatComposer({
  chat,
  onNewStreamPromise,
  onAbortController,
  isStreaming,
  versions = [],
  currentVersionId,
  allowGitImport = true,
}: {
  chat: Chat;
  onNewStreamPromise: (
    v: Promise<ReadableStream>,
    options?: { reasoning: boolean; messageId?: string; model?: string },
  ) => void;
  onAbortController?: (c: AbortController | null) => void;
  isStreaming: boolean;
  versions?: { id: string; version: number; label: string }[];
  currentVersionId?: string;
  allowGitImport?: boolean;
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
        if (isGitHubUrl(trimmed) && allowGitImport) {
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

  return {
    prompt,
    setPrompt,
    model,
    modelOptions,
    mode,
    cycleMode: () => setMode((current) => (current === "agent" ? "plan" : current === "plan" ? "ask" : "agent")),
    abilityModalOpen,
    setAbilityModalOpen,
    activeAbilities,
    setActiveAbilities,
    isPending,
    disabled,
    composerRef,
    handleModelChange,
    handleSend,
    activeCheckpoint,
  };
}
