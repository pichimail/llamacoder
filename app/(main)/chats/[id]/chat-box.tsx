"use client";

import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import {
  ChevronDown,
  Plus,
  Undo2,
  X,
  ArrowUp,
  Square,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";

const selectItemCls =
  "flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-xs text-popover-foreground outline-none data-[highlighted]:bg-accent";
const selectContentCls =
  "z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-xl";
const ghostTrigger =
  "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(chat.model);
  const [quality, setQuality] = useState("low");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
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

  const handleScreenshotUpload = async (event: any) => {
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
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/blob-upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Blob upload failed");
      const blob = (await response.json()) as { url?: string };
      if (!blob.url) throw new Error("No URL returned");
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

  useEffect(() => {
    if (!textareaRef.current) return;
    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  useEffect(() => {
    if (shouldFocusInput && textareaRef.current) {
      textareaRef.current.focus();
      onInputFocused?.();
    }
  }, [shouldFocusInput, onInputFocused]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    if (!prompt.trim() && !screenshotUrl) return;

    startTransition(async () => {
      let finalPrompt =
        prompt.trim() || (screenshotUrl ? "Update the app to match this" : "");
      if (!finalPrompt) return;
      if (versions.length > 0) {
        finalPrompt = `Apply the following change as a precise, minimal patch to the existing app (only output files that actually need to change):\n\n${finalPrompt}`;
      }

      const controller = new AbortController();
      onAbortController?.(controller);
      const message = await createMessage(chat.id, finalPrompt, "user");

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
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    });
  };

  const canUndo = !!onUndo && versions.length > 1;

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="relative w-full">
        <div
          className="flex w-full flex-col rounded-2xl border border-border/70 bg-card/60 backdrop-blur transition focus-within:border-ring/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/"))
              handleScreenshotUpload({ target: { files: [file] } });
          }}
        >
          {screenshotUrl && (
            <div className="flex items-center gap-2 px-3 pt-2.5">
              <div className="relative">
                <img
                  src={screenshotUrl}
                  alt="Attached screenshot"
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotUrl(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border hover:text-red-400"
                  aria-label="Remove screenshot"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            placeholder="Describe a change…"
            name="prompt"
            aria-label="Message to the AI app builder"
            className="w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
            rows={1}
            style={{ minHeight: "22px", maxHeight: "120px" }}
            value={prompt}
            disabled={disabled}
            onChange={(e) => {
              setPrompt(e.target.value);
              const t = textareaRef.current;
              if (t) {
                t.style.height = "auto";
                t.style.height = Math.min(120, t.scrollHeight) + "px";
              }
            }}
            onPaste={async (e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                      e.preventDefault();
                      handleScreenshotUpload({ target: { files: [file] } });
                      return;
                    }
                  }
                }
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                (event.target as HTMLTextAreaElement)
                  .closest("form")
                  ?.requestSubmit();
              }
            }}
          />

          {/* Toolbar — borderless, icon-first, tooltips */}
          <div className="flex items-center gap-0.5 px-2 pb-2 pt-0.5">
            <Tip label={isScreenshotUploadAvailable ? "Attach image" : "Attachments disabled"}>
              <label
                htmlFor="screenshot"
                className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground ${!isScreenshotUploadAvailable ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="sr-only">Attach image</span>
              </label>
            </Tip>
            <input
              id="screenshot"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleScreenshotUpload}
              className="hidden"
              ref={fileInputRef}
              disabled={!isScreenshotUploadAvailable}
            />

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

            <div className="flex-1" />

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

            <Tip label={isStreaming ? "Stop (Esc)" : "Send (Enter)"}>
              <button
                type={isStreaming && onStop ? "button" : "submit"}
                onClick={isStreaming && onStop ? onStop : undefined}
                disabled={
                  isStreaming && onStop
                    ? isPending
                    : disabled ||
                      screenshotLoading ||
                      (!prompt.trim() && !screenshotUrl)
                }
                className="ml-1 inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-40"
                aria-label={isStreaming && onStop ? "Stop generation" : "Send message"}
              >
                <Spinner loading={isPending || screenshotLoading}>
                  {isStreaming && onStop ? (
                    <Square className="size-3 fill-current" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="size-4" aria-hidden="true" />
                  )}
                </Spinner>
              </button>
            </Tip>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
