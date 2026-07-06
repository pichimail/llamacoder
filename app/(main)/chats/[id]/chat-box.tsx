"use client";

import { ProductionInputBar as InputBar, type AttachedFile, type AttachedImage } from "@/components/agent-elements/production-input-bar";
import { OptionDropdown } from "@/components/option-dropdown";
import { Brain, Code2, Database, MessageSquare, Palette, Shield, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { useAvailableModels } from "@/lib/use-available-models";
import { toast } from "@/hooks/use-toast";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { askModePrompt, planModePrompt } from "@/lib/prompts";
import { PlanModePanel } from "@/components/plan-mode-panel";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter } from "@/components/ai-elements/context";

const ghostTrigger =
  "h-7 px-1.5 text-xs text-muted-foreground transition hover:text-foreground";
type ComposerMode = "ask" | "plan" | "agent";
type ComposerAttachment = {
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
};

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
  /** "minimal" renders a single-line input (message icon + text + send) with
   * every other control (mode, model, mic, attach, suggestions) hidden — used
   * for the floating composer shown when the chat rail isn't docked. Clicking
   * the leading icon calls onExpand so the caller can swap in the full variant. */
  variant?: "full" | "minimal";
  onExpand?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || isStreaming;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(chat.model);
  const [quality] = useState<"low" | "high">(
    chat.quality === "high" ? "high" : "low",
  );
  const [mode, setMode] = useState<ComposerMode>("agent");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<
    boolean | null
  >(null);
  const availableModels = useAvailableModels();

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

  const persistBuilderSettings = async (updates: {
    model?: string;
  }) => {
    await fetch(`/api/chats/${chat.id}/builder-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => undefined);
  };

  const handleModelChange = (nextModel: string) => {
    setModel(nextModel);
    void persistBuilderSettings({ model: nextModel });
  };

  const suggestionItems = useMemo(
    () => [
      {
        label: "Improve UI hierarchy",
        value: "Improve the current artifact UI hierarchy with stronger spacing, clearer sections, sharper typography, and polished dark/light states.",
        icon: <Palette className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add empty/loading/error states",
        value: "Add complete empty, loading, and error states for every major data surface in this artifact.",
        icon: <Sparkles className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add filters and search",
        value: "Add working local search, filtering, sorting, and view controls to the current dashboard/app data surfaces.",
        icon: <Code2 className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add backend scaffold",
        value: "Add preview-safe backend-shaped files for API routes, typed data access, and environment variable placeholders without breaking the live preview.",
        icon: <Database className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add role permissions",
        value: "Add a role permissions workflow with local state, protected actions, audit-friendly UI, and clear admin/operator states.",
        icon: <Shield className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add ChinnaLLM assistant",
        value: "Integrate a ChinnaLLM assistant feature with platform credits or BYOK, local preview fallback, and required UI states.",
        icon: <Brain className="size-3.5" aria-hidden="true" />,
      },
      {
        label: "Add AI analysis",
        value: "Integrate a ChinnaLLM analysis panel with platform credits or BYOK, local preview fallback, and required UI states.",
        icon: <Brain className="size-3.5" aria-hidden="true" />,
      },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blob-upload/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => !cancelled && setBlobUploadConfigured(!!d.configured))
      .catch(() => !cancelled && setBlobUploadConfigured(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isScreenshotUploadAvailable) {
      toast({
        title: "Attachments unavailable",
        description: "Blob upload is not configured in this environment.",
        variant: "destructive",
      });
      return;
    }
    if (prompt.length === 0) setPrompt("Update the app to match this");
    setScreenshotLoading(true);
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/blob-upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Blob upload failed");
      const blob = (await response.json()) as { url?: string };
      if (!blob.url) throw new Error("No URL returned");
      if (file.type.startsWith("image/")) {
        setAttachedImages([
          {
            id: crypto.randomUUID(),
            filename: file.name || "attachment.png",
            url: blob.url,
            size: file.size,
          },
        ]);
        setAttachedFiles([]);
      } else {
        setAttachedFiles([
          {
            id: crypto.randomUUID(),
            filename: file.name || "attachment",
            size: file.size,
          },
        ]);
        setAttachedImages([]);
      }
      setScreenshotUrl(blob.url);
    } catch (error) {
      setScreenshotUrl(undefined);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!isScreenshotUploadAvailable) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      await handleScreenshotUpload({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      break;
    }
  };

  useEffect(() => {
    if (!shouldFocusInput) return;
    const textarea = composerRef.current?.querySelector("textarea");
    textarea?.focus();
    onInputFocused?.();
  }, [shouldFocusInput, onInputFocused]);

  const buildModePrefix = () => {
    if (mode === "ask") return askModePrompt.trim();
    if (mode === "plan") return planModePrompt.trim();
    return "Apply the following change as a precise, minimal patch to the existing app (only output files that actually need to change):";
  };

  const handleSend = async ({ content }: { role: "user"; content: string }) => {
    if (isStreaming) return;
    const trimmed = content.trim();
    if (!trimmed && !screenshotUrl) return;

    startTransition(async () => {
      const modePrefix = buildModePrefix();
      let finalPrompt = trimmed || (screenshotUrl ? "Update the app to match this" : "");
      if (!finalPrompt) return;
      finalPrompt = `${modePrefix}\n\n${finalPrompt}`;

      const attachments: ComposerAttachment[] = [
        ...attachedImages.map((image) => ({
          kind: "image" as const,
          filename: image.filename,
          url: image.url,
          size: image.size,
        })),
        ...attachedFiles.map((file) => ({
          kind: "file" as const,
          filename: file.filename,
          url: screenshotUrl,
          size: file.size,
        })),
      ];

      if (attachments.length > 0) {
        finalPrompt += `\n\nAttachments:\n${attachments
          .map((attachment, index) => {
            const parts = [
              `${index + 1}. [${attachment.kind}] ${attachment.filename}`,
            ];
            if (attachment.size) parts.push(`${Math.round(attachment.size / 1024)} KB`);
            if (attachment.url) parts.push(attachment.url);
            return parts.join(" - ");
          })
          .join("\n")}`;
      }

      // When iterating on an existing app, give the model a strong signal.
      // The patch system prompt in the backend + previous assistant message already contain the files.
      if (versions && versions.length > 0 && currentVersionId) {
        finalPrompt = `Iterate on the existing application (current version: ${versions.find(v => v.id === currentVersionId)?.label || 'latest'}).\n\nUser request:\n${finalPrompt}\n\nReturn only the files that need to change or be added. Use exact \`\`\`lang{path=...} format. Preserve all working structure.`;
      }

      const controller = new AbortController();
      onAbortController?.(controller);
      const message = await createMessage(
        chat.id,
        finalPrompt,
        "user",
        attachments.length > 0 ? (attachments as any[]) : undefined,
      );

      const streamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messageId: message.id,
          model,
          reasoning: false,
          quality,
        }),
      })
        .then(async (res) => {
          if (!res.ok)
            throw new Error((await res.text()) || "Failed to start generation");
          if (!res.body) throw new Error("No body on response");
          return res.body;
        })
        .catch((err) => {
          if (err?.name === "AbortError") {
            onAbortController?.(null);
            return null as any;
          }
          onAbortController?.(null);
          toast({
            title: "Generation failed",
            description: err instanceof Error ? err.message : String(err),
            variant: "destructive",
          });
          throw err;
        });

      onNewStreamPromise(streamPromise, { reasoning: false, messageId: message.id, model });
      startTransition(() => {
        setPrompt("");
        setScreenshotUrl(undefined);
        setAttachedImages([]);
        setAttachedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    });
  };

  const canUndo = !!onUndo && versions.length > 1;

  const chatInfoBar =
    mode === "ask"
      ? {
          title: "Ask mode",
          description: "Use this for targeted answers and smaller edits.",
          position: "bottom" as const,
        }
      : undefined;

  return (
    <TooltipProvider>
      <div ref={composerRef} className="relative w-full">
        <label htmlFor="screenshot" className="sr-only">
          Attach image or file
        </label>
        <input
          id="screenshot"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
          onChange={handleScreenshotUpload}
          className="hidden"
          ref={fileInputRef}
          disabled={!isScreenshotUploadAvailable}
          aria-label="Attach image or file"
        />

        {variant === "full" && mode === "plan" ? <PlanModePanel className="mb-3" /> : null}

        {variant === "full" && (
          <Suggestions className="mb-2 px-1">
            {suggestionItems.map((item) => (
              <Suggestion
                key={item.label}
                suggestion={item.value}
                onClick={(value) => setPrompt(value)}
                disabled={disabled}
                className="h-8 shrink-0 gap-1.5 border-border/70 bg-zinc-950/70 px-3 text-xs text-muted-foreground hover:border-fuchsia-400/30 hover:bg-zinc-900 hover:text-foreground"
              >
                {item.icon}
                {item.label}
              </Suggestion>
            ))}
          </Suggestions>
        )}

        <InputBar
          value={prompt}
          onChange={setPrompt}
          onSend={handleSend}
          onStop={onStop ?? (() => {})}
          status={
            isStreaming
              ? "streaming"
              : isPending || screenshotLoading
                ? "submitted"
                : "ready"
          }
          placeholder="Describe a change…"
          disabled={disabled}
          autoFocus={variant === "full"}
          onAttach={variant === "full" ? handleAttachClick : undefined}
          onPaste={handlePaste}
          attachedImages={attachedImages}
          attachedFiles={attachedFiles}
          onRemoveImage={() => {
            setAttachedImages([]);
            setScreenshotUrl(undefined);
          }}
          onRemoveFile={() => {
            setAttachedFiles([]);
            setScreenshotUrl(undefined);
          }}
          infoBar={variant === "full" ? chatInfoBar : undefined}
          leftActions={
            variant === "minimal" ? (
              <Tip label="Show full composer">
                <button
                  type="button"
                  onClick={onExpand}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Show full composer"
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                </button>
              </Tip>
            ) : (
              <OptionDropdown
                value={mode}
                onValueChange={(value) => setMode(value as ComposerMode)}
                aria-label="Select mode"
                tip="Mode"
                triggerLabel={<span className="capitalize">{mode}</span>}
                triggerClassName={ghostTrigger}
                options={(["ask", "plan", "agent"] as const).map((value) => ({
                  value,
                  label: <span className="capitalize">{value}</span>,
                }))}
              />
            )
          }
          rightActions={
            variant === "minimal" ? undefined :
            <div className="flex items-center gap-1">
              <SpeechInput
                onTranscriptionChange={(text) => setPrompt((current) => `${current}${current.trim() ? " " : ""}${text}`)}
                disabled={disabled}
                className="size-7 rounded-md border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Dictate chat prompt (speech-to-text)"
              />

              <OptionDropdown
                value={model}
                onValueChange={handleModelChange}
                aria-label="Select AI model"
                tip="Model"
                triggerLabel={
                  availableModels?.find((item) => item.value === model)?.label ??
                  MODELS.find((item) => item.value === model)?.label ??
                  model
                }
                triggerClassName={ghostTrigger}
                options={(availableModels ?? MODELS.filter((item) => !item.hidden)).map((item) => ({
                  value: item.value,
                  label:
                    "available" in item && item.available === false
                      ? `${item.label} (needs API key)`
                      : item.label,
                  disabled: "available" in item ? !item.available : false,
                }))}
              />

              {/* Subtle Context icon wired with model context - exactly in chats prompt, functional */}
              <Context 
                usedTokens={Math.floor(prompt.length / 4) + 200} 
                maxTokens={model.includes('GLM') ? 128000 : model.includes('claude') ? 200000 : 128000} 
                modelId={model}
              >
                <ContextTrigger asChild>
                  <button 
                    type="button" 
                    className="size-7 rounded-md border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center text-xs" 
                    aria-label="Model context"
                    title="Model context usage"
                  >
                    📊
                  </button>
                </ContextTrigger>
                <ContextContent>
                  <ContextContentHeader>
                    <span className="text-sm font-medium">Context • {model.split('/').pop()}</span>
                  </ContextContentHeader>
                  <ContextContentBody>
                    <div className="text-xs text-muted-foreground">
                      ~{Math.floor(prompt.length / 4)} tokens used in prompt<br />
                      Approx context usage for model
                    </div>
                  </ContextContentBody>
                  <ContextContentFooter>
                    <span className="text-[10px] text-muted-foreground">Click for details (demo)</span>
                  </ContextContentFooter>
                </ContextContent>
              </Context>

              {versions.length > 0 && onSwitchVersion && (
                <OptionDropdown
                  value={currentVersionId || versions[versions.length - 1]?.id || ""}
                  onValueChange={onSwitchVersion}
                  aria-label="Restore checkpoint"
                  tip="Restore checkpoint"
                  disabled={disabled}
                  triggerLabel={
                    versions.find((version) => version.id === currentVersionId)?.label ??
                    versions[versions.length - 1]?.label
                  }
                  triggerClassName={ghostTrigger}
                  options={versions
                    .slice()
                    .reverse()
                    .map((version) => ({
                      value: version.id,
                      label: `Restore ${version.label}`,
                    }))}
                />
              )}

              {onUndo && (
                <Tip label="Previous version">
                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo || disabled}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                    aria-label="Undo last version"
                  >
                    <Undo2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
              )}
            </div>
          }
        />
      </div>
    </TooltipProvider>
  );
}
