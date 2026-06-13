"use client";

import { InputBar, type AttachedFile, type AttachedImage } from "@/components/agent-elements/input-bar";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Undo2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { askModePrompt, planModePrompt } from "@/lib/prompts";

const selectItemCls =
  "flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-xs text-popover-foreground outline-none data-[highlighted]:bg-accent";
const selectContentCls =
  "z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-xl";
const ghostTrigger =
  "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";
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

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

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
        body: JSON.stringify({ messageId: message.id, model }),
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
          infoBar={{
            title:
              mode === "agent"
                ? "Agent mode"
                : mode === "plan"
                  ? "Plan mode"
                  : "Ask mode",
            description:
              mode === "agent"
                ? "Full-stack builds with model, quality, and version controls."
                : mode === "plan"
                  ? "Collect a focused brief before sending the patch."
                  : "Use this for targeted answers and smaller edits.",
            position: "bottom",
          }}
          leftActions={
            <Select.Root value={mode} onValueChange={(value) => setMode(value as ComposerMode)}>
              <Tip label="Mode">
                <Select.Trigger aria-label="Select mode" className={ghostTrigger}>
                  <span className="capitalize">{mode}</span>
                  <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
                </Select.Trigger>
              </Tip>
              <Select.Portal>
                <Select.Content className={selectContentCls}>
                  <Select.Viewport className="p-1">
                    {["ask", "plan", "agent"].map((value) => (
                      <Select.Item key={value} value={value} className={selectItemCls}>
                        <Select.ItemText className="capitalize">{value}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          }
          rightActions={
            <div className="flex items-center gap-1">
              <Select.Root value={model} onValueChange={setModel}>
                <Tip label="Model">
                  <Select.Trigger aria-label="Select AI model" className={ghostTrigger}>
                    <Select.Value />
                    <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
                  </Select.Trigger>
                </Tip>
                <Select.Portal>
                  <Select.Content className={selectContentCls}>
                    <Select.Viewport className="p-1">
                      {MODELS.filter((m) => !m.hidden).map((m) => (
                        <Select.Item key={m.value} value={m.value} className={selectItemCls}>
                          <Select.ItemText>{m.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <Select.Root value={quality} onValueChange={setQuality}>
                <Tip label={quality === "high" ? "Quality: high (slower)" : "Quality: fast"}>
                  <Select.Trigger aria-label="Select generation quality" className={ghostTrigger}>
                    <Zap
                      className={`size-3.5 ${quality === "high" ? "text-amber-400" : ""}`}
                      aria-hidden="true"
                    />
                  </Select.Trigger>
                </Tip>
                <Select.Portal>
                  <Select.Content className={selectContentCls}>
                    <Select.Viewport className="p-1">
                      <Select.Item value="low" className={selectItemCls}>
                        <Select.ItemText>Fast</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="high" className={selectItemCls}>
                        <Select.ItemText>High quality</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {versions.length > 0 && onSwitchVersion && (
                <Select.Root
                  value={currentVersionId || ""}
                  onValueChange={onSwitchVersion}
                  disabled={disabled}
                >
                  <Tip label="Switch version">
                    <Select.Trigger aria-label="Switch app version" className={ghostTrigger}>
                      <Select.Value />
                      <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
                    </Select.Trigger>
                  </Tip>
                  <Select.Portal>
                    <Select.Content className={selectContentCls}>
                      <Select.Viewport className="p-1">
                        {versions
                          .slice()
                          .reverse()
                          .map((v) => (
                            <Select.Item key={v.id} value={v.id} className={selectItemCls}>
                              <Select.ItemText>{v.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
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
