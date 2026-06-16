"use client";

import { InputBar, type AttachedFile, type AttachedImage } from "@/components/agent-elements/input-bar";
import { OptionDropdown } from "@/components/option-dropdown";
import { Undo2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { askModePrompt, planModePrompt } from "@/lib/prompts";
import { BuilderToggles } from "@/components/builder-toggles";
import { PromptRewriteButton } from "@/components/prompt-rewrite-button";

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
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>) => void;
  onAbortController?: (c: AbortController | null) => void;
  isStreaming: boolean;
  onStop?: () => void;
  onUndo?: () => void;
  versions?: { id: string; version: number; label: string }[];
  currentVersionId?: string;
  onSwitchVersion?: (id: string) => void;
  shouldFocusInput?: boolean;
  onInputFocused?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const disabled = isPending || isStreaming;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(chat.model);
  const [quality, setQuality] = useState("low");
  const [mode, setMode] = useState<ComposerMode>("agent");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<
    boolean | null
  >(null);
  const [shadcnEnabled, setShadcnEnabled] = useState(chat.shadcn);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

  const persistShadcn = async (enabled: boolean) => {
    setShadcnEnabled(enabled);
    await fetch(`/api/chats/${chat.id}/builder-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shadcn: enabled }),
    }).catch(() => undefined);
  };

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
    if (shouldFocusInput) {
      onInputFocused?.();
    }
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
        signal: controller.signal,
        body: JSON.stringify({ messageId: message.id, model, reasoning: reasoningEnabled }),
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

      onNewStreamPromise(streamPromise);
      startTransition(() => {
        router.refresh();
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
    mode === "plan"
      ? {
          title: "Plan mode",
          description: "Collect a focused brief before sending the patch.",
          position: "bottom" as const,
        }
      : mode === "ask"
        ? {
            title: "Ask mode",
            description: "Use this for targeted answers and smaller edits.",
            position: "bottom" as const,
          }
        : undefined;

  return (
    <TooltipProvider>
      <div className="relative w-full">
        <input
          id="screenshot"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
          onChange={handleScreenshotUpload}
          className="hidden"
          ref={fileInputRef}
          disabled={!isScreenshotUploadAvailable}
        />

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
          autoFocus
          onAttach={handleAttachClick}
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
          infoBar={chatInfoBar}
          leftActions={
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
          }
          rightActions={
            <div className="flex items-center gap-1">
              <BuilderToggles
                compact
                shadcnEnabled={shadcnEnabled}
                onShadcnChange={persistShadcn}
                reasoningEnabled={reasoningEnabled}
                onReasoningChange={setReasoningEnabled}
              />
              <PromptRewriteButton
                prompt={prompt}
                mode={mode}
                model={model}
                onRewrite={setPrompt}
                disabled={disabled}
              />
              <OptionDropdown
                value={model}
                onValueChange={setModel}
                aria-label="Select AI model"
                tip="Model"
                triggerLabel={
                  MODELS.find((item) => item.value === model)?.label ?? model
                }
                triggerClassName={ghostTrigger}
                options={MODELS.filter((item) => !item.hidden).map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />

              <OptionDropdown
                value={quality}
                onValueChange={setQuality}
                aria-label="Select generation quality"
                tip={quality === "high" ? "Quality: high (slower)" : "Quality: fast"}
                triggerLabel={
                  <Zap
                    className={`size-3.5 ${quality === "high" ? "text-amber-400" : ""}`}
                    aria-hidden="true"
                  />
                }
                triggerClassName={ghostTrigger}
                options={[
                  { value: "low", label: "Fast" },
                  { value: "high", label: "High quality" },
                ]}
              />

              {versions.length > 0 && onSwitchVersion && (
                <OptionDropdown
                  value={currentVersionId || versions[versions.length - 1]?.id || ""}
                  onValueChange={onSwitchVersion}
                  aria-label="Switch app version"
                  tip="Switch version"
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
                      label: version.label,
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
