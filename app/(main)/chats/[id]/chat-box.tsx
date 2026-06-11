"use client";

import LightningBoltIcon from "@/components/icons/lightning-bolt";
import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, Plus, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

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
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<
    boolean | null
  >(null);

  const qualityOptions = useMemo(
    () => [
      { value: "low", label: "Low quality [faster]" },
      { value: "high", label: "High quality [slower]" },
    ],
    [],
  );

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

  useEffect(() => {
    let cancelled = false;

    async function loadUploadConfig() {
      try {
        const response = await fetch("/api/blob-upload/config", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Upload config unavailable");
        const data = (await response.json()) as {
          configured?: boolean;
        };
        if (!cancelled) setBlobUploadConfigured(!!data.configured);
      } catch {
        if (!cancelled) setBlobUploadConfigured(false);
      }
    }

    loadUploadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScreenshotUpload = async (event: any) => {
    if (!isScreenshotUploadAvailable) {
      setScreenshotUrl(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "Screenshot upload unavailable",
        description:
          "Blob upload is not configured in this environment, so attachments are disabled.",
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

      if (!response.ok) {
        let message = "Blob upload failed";
        try {
          const error = await response.json();
          if (error?.error) message = error.error;
        } catch {}
        throw new Error(message);
      }

      const blob = (await response.json()) as { url?: string };
      if (!blob.url) throw new Error("Blob upload did not return a URL.");
      setScreenshotUrl(blob.url);
    } catch (error) {
      console.error("Screenshot upload failed:", error);
      setScreenshotUrl(undefined);
      alert(
        "Screenshot upload is not available right now. You can still send the message without an attachment.",
      );
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleDroppedOrPastedImage = (file: File) => {
    const fakeEvent = { target: { files: [file] } };
    handleScreenshotUpload(fakeEvent);
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
  }, [shouldFocusInput]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    if (!prompt.trim() && !screenshotUrl) return;

    startTransition(async () => {
      let finalPrompt =
        prompt.trim() || (screenshotUrl ? "Update the app to match this" : "");
      if (!finalPrompt) return;

      // Minimal iteration UX boost (no UI): make follow-ups feel like precise patches
      if (versions.length > 0) {
        finalPrompt = `Apply the following change as a precise, minimal patch to the existing app (only output files that actually need to change):\n\n${finalPrompt}`;
      }

      const controller = new AbortController();
      onAbortController?.(controller);

      const message = await createMessage(chat.id, finalPrompt, "user");

      const streamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          messageId: message.id,
          model,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error((await res.text()) || "Failed to start generation");
          }
          if (!res.body) {
            throw new Error("No body on response");
          }
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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // clear controller after submit handoff
        // parent will clear on finish / stop
      });
    });
  };

  const canUndo = !!onUndo && versions.length > 1;

  return (
    <div className="mx-auto w-full max-w-3xl px-1">
      <form onSubmit={handleSubmit} className="relative">
        {/* Completely redesigned premium chat input - v0/lovable style */}
        <div
          className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl focus-within:border-ring/40 transition-all"
          role="form"
          aria-label="Chat input form"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) {
              handleDroppedOrPastedImage(file);
            }
          }}
        >
          {/* Attached screenshot preview (if any) */}
          {screenshotUrl && (
            <div className="relative mx-4 mt-3 flex items-center gap-2">
              <div className="relative">
                <img
                  src={screenshotUrl}
                  alt="Attached screenshot"
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotUrl(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border hover:text-red-400"
                  aria-label="Remove screenshot"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground">Screenshot attached</div>
            </div>
          )}

          {/* Clean auto-growing textarea */}
          <div className="relative px-5 pt-4 pb-1">
            <textarea
              ref={textareaRef}
              placeholder="Continue the conversation..."
              name="prompt"
              aria-label="Message to the AI app builder"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
              rows={1}
              style={{ minHeight: "24px", maxHeight: "140px" }}
              value={prompt}
              disabled={disabled}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Auto grow
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = Math.min(140, Math.max(24, textareaRef.current.scrollHeight)) + 'px';
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
                        handleDroppedOrPastedImage(file);
                        return;
                      }
                    }
                  }
                }

                e.preventDefault();
                const pastedText = e.clipboardData.getData("text");
                const cleanedText = pastedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

                const isImageUrl = /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(cleanedText);
                if (isImageUrl) {
                  setScreenshotUrl(cleanedText);
                  if (!prompt) setPrompt("Update the app to match this");
                  return;
                }

                const textarea = e.target as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = prompt.slice(0, start) + cleanedText + prompt.slice(end);
                setPrompt(newValue);
                // Restore caret right after the pasted text
                requestAnimationFrame(() => {
                  const pos = start + cleanedText.length;
                  textarea.setSelectionRange(pos, pos);
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const target = event.target as HTMLTextAreaElement;
                  target.closest("form")?.requestSubmit();
                }
              }}
            />
          </div>

          {/* Bottom toolbar - subtle and premium */}
          <div className="flex items-center justify-between border-t border-border px-3 py-[7px]">
            <div className="flex items-center gap-1.5 pl-1">
              {/* Attach */}
              <label
                htmlFor="screenshot"
                className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-accent hover:text-foreground ${!isScreenshotUploadAvailable ? "cursor-not-allowed opacity-40" : ""}`}
                title={isScreenshotUploadAvailable ? "Attach screenshot" : "Attachments disabled"}
              >
                <Plus className="h-4 w-4" />
              </label>
              <input
                id="screenshot"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleScreenshotUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={!isScreenshotUploadAvailable}
              />

              {/* Model */}
              <Select.Root value={model} onValueChange={setModel}>
                <Select.Trigger aria-label="Select AI model" className="inline-flex h-8 items-center gap-1.5 rounded-2xl px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Select.Value />
                  <ChevronDownIcon className="h-3 w-3" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                    <Select.Viewport className="p-1">
                      {MODELS.filter((m) => !m.hidden).map((m) => (
                        <Select.Item key={m.value} value={m.value} className="flex cursor-pointer items-center rounded-xl px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent">
                          <Select.ItemText>{m.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* Quality */}
              <Select.Root value={quality} onValueChange={setQuality}>
                <Select.Trigger aria-label="Select generation quality" className="inline-flex h-8 items-center gap-1.5 rounded-2xl px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <LightningBoltIcon className="h-3.5 w-3.5" />
                  <Select.Value />
                  <ChevronDownIcon className="h-3 w-3" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                    <Select.Viewport className="p-1">
                      {qualityOptions.map((q) => (
                        <Select.Item key={q.value} value={q.value} className="flex cursor-pointer items-center rounded-xl px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent">
                          <Select.ItemText>{q.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex items-center gap-2 pr-1">
              {/* Versions + Undo */}
              {versions.length > 0 && onSwitchVersion && (
                <Select.Root value={currentVersionId || ""} onValueChange={(val) => onSwitchVersion(val)} disabled={isStreaming || disabled}>
                  <Select.Trigger aria-label="Switch app version" className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-background px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Select.Value />
                    <ChevronDownIcon className="h-3 w-3" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                      <Select.Viewport className="p-1">
                        {versions.slice().reverse().map((v) => (
                          <Select.Item key={v.id} value={v.id} className="flex cursor-pointer items-center rounded-xl px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent">
                            <Select.ItemText>{v.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              )}

              {onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo || disabled || isStreaming}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                  aria-label="Undo last version"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
              )}

              {/* Primary Send / Stop */}
              <button
                type={isStreaming && onStop ? "button" : "submit"}
                onClick={isStreaming && onStop ? onStop : undefined}
                disabled={
                  isStreaming && onStop ? isPending : disabled || screenshotLoading || (!prompt.trim() && !screenshotUrl)
                }
                className="inline-flex h-9 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={isStreaming && onStop ? "Stop generation" : "Send"}
              >
                <Spinner loading={isPending || screenshotLoading}>
                  {isStreaming && onStop ? "Stop" : "Send"}
                </Spinner>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
