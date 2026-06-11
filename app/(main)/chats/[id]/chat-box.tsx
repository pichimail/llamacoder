"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, Plus, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";
import { dynamicFullStackPromptButtons } from "@/lib/prompts";
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

  const textareaResizePrompt = useMemo(
    () =>
      prompt
        .split("\n")
        .map((text) => (text === "" ? "a" : text))
        .join("\n"),
    [prompt],
  );

  const selectedModel = useMemo(
    () => MODELS.find((m) => m.value === model),
    [model],
  );

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
        .then((res) => {
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
    <div className="mx-auto mb-5 flex w-full max-w-prose shrink-0 px-4">
      <form className="relative flex w-full" onSubmit={handleSubmit}>
        {/* Very minimal suggestion chips — only shown when not streaming */}
        {!isStreaming && (
          <div className="mb-1 flex flex-wrap gap-1">
            {dynamicFullStackPromptButtons.slice(0, 4).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(chip);
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="rounded bg-muted/60 px-2 py-px text-[9px] leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div
          className="relative flex w-full rounded-xl border border-border bg-card pb-10 shadow-sm"
          role="form"
          aria-label="Chat input form"
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) {
              handleDroppedOrPastedImage(file);
            }
          }}
        >
          {screenshotLoading && (
            <div className="relative mx-3 mt-3">
              <div className="rounded-xl">
                <div className="group mb-2 flex h-16 w-[68px] animate-pulse items-center justify-center rounded bg-muted">
                  <Spinner />
                </div>
              </div>
            </div>
          )}
          {screenshotUrl && (
            <div
              className={`${isPending ? "invisible" : ""} relative mx-3 mt-3`}
            >
              <div className="rounded-xl">
                <img
                  alt="screenshot"
                  src={screenshotUrl}
                  className="group relative mb-2 h-16 w-[68px] rounded object-cover"
                />
              </div>
              <button
                type="button"
                id="x-circle-icon"
                className="absolute -right-3 -top-4 left-14 z-10 size-5 rounded-full bg-background text-foreground shadow hover:text-muted-foreground"
                aria-label="Remove attached screenshot"
                onClick={() => {
                  setScreenshotUrl(undefined);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="relative w-full">
            <div className="p-3">
              <p className="invisible w-full whitespace-pre-wrap">
                {textareaResizePrompt}
              </p>
            </div>
            <textarea
              ref={textareaRef}
              placeholder="Describe changes or ask a follow-up..."
              required
              name="prompt"
              rows={2}
              className="peer absolute inset-0 w-full resize-none bg-transparent px-4 py-3 placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50"
              aria-label="Follow-up prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={async (e) => {
                // Handle pasted images first (from browser, screenshots, etc.)
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

                // Clean up pasted text
                e.preventDefault();
                const pastedText = e.clipboardData.getData("text");

                const cleanedText = pastedText
                  .replace(/\r\n/g, "\n")
                  .replace(/\r/g, "\n")
                  .replace(/\n{3,}/g, "\n\n")
                  .trim();

                // Support pasting a direct image URL (minimal attach, no extra UI)
                const isImageUrl =
                  /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(
                    cleanedText,
                  );
                if (isImageUrl) {
                  setScreenshotUrl(cleanedText);
                  if (prompt.length === 0)
                    setPrompt("Update the app to match this");
                  return;
                }

                const textarea = e.target as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue =
                  prompt.slice(0, start) + cleanedText + prompt.slice(end);

                setPrompt(newValue);

                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart =
                      start + cleanedText.length;
                    textareaRef.current.selectionEnd =
                      start + cleanedText.length;
                  }
                }, 0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const target = event.target;
                  if (!(target instanceof HTMLTextAreaElement)) return;
                  target.closest("form")?.requestSubmit();
                }
              }}
            />
          </div>

          <div className="absolute bottom-2 left-3 right-2.5 flex items-center justify-between">
            <label
              htmlFor="screenshot"
              className={`absolute bottom-0 left-0 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${!isScreenshotUploadAvailable ? "cursor-not-allowed opacity-50 hover:bg-background hover:text-muted-foreground" : "cursor-pointer"}`}
              aria-label="Attach screenshot"
              title={
                isScreenshotUploadAvailable
                  ? "Attach screenshot"
                  : "Attach disabled"
              }
            >
              <Plus className="size-4" aria-hidden="true" />
            </label>

            <div className="flex items-center gap-3 pl-10">
              <Select.Root value={model} onValueChange={setModel}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded-md p-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="Select AI model"
                >
                  <Select.Value aria-label={model}>
                    <span>{selectedModel?.label}</span>
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDownIcon className="size-3" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="overflow-hidden rounded-md border border-border bg-popover shadow-md"
                    role="listbox"
                  >
                    <Select.Viewport className="space-y-1 p-2">
                      {MODELS.filter((m) => !m.hidden).map((m) => (
                        <Select.Item
                          key={m.value}
                          value={m.value}
                          className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm text-foreground data-[highlighted]:bg-accent data-[highlighted]:outline-none"
                          role="option"
                        >
                          <Select.ItemText className="inline-flex items-center gap-2 text-foreground">
                            {m.label}
                          </Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon className="size-3 text-blue-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                    <Select.ScrollDownButton />
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <div
                className="h-4 w-px bg-border max-sm:hidden"
                aria-hidden="true"
              />

              <Select.Root value={quality} onValueChange={setQuality}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded p-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="Select quality"
                >
                  <Select.Value aria-label={quality}>
                    <span className="max-sm:hidden">
                      {quality === "low"
                        ? "Low quality [faster]"
                        : "High quality [slower]"}
                    </span>
                    <span className="sm:hidden">
                      <LightningBoltIcon className="size-3" />
                    </span>
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDownIcon className="size-3" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="overflow-hidden rounded-md border border-border bg-popover shadow-md"
                    role="listbox"
                  >
                    <Select.Viewport className="space-y-1 p-2">
                      {qualityOptions.map((q) => (
                        <Select.Item
                          key={q.value}
                          value={q.value}
                          className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm text-foreground data-[highlighted]:bg-accent data-[highlighted]:outline-none"
                          role="option"
                        >
                          <Select.ItemText className="inline-flex items-center gap-2 text-foreground">
                            {q.label}
                          </Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon className="size-3 text-blue-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                    <Select.ScrollDownButton />
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {versions.length > 0 && onSwitchVersion && (
                <>
                  <div
                    className="h-4 w-px bg-border max-sm:hidden"
                    aria-hidden="true"
                  />
                  <Select.Root
                    value={currentVersionId || ""}
                    onValueChange={(val) => onSwitchVersion(val)}
                    disabled={isStreaming || disabled}
                  >
                    <Select.Trigger
                      className="inline-flex items-center gap-1 rounded-md p-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      aria-label="Switch version"
                    >
                      <Select.Value>
                        {versions.find((v) => v.id === currentVersionId)
                          ?.label ||
                          (versions.length
                            ? versions[versions.length - 1].label
                            : "v?")}
                      </Select.Value>
                      <Select.Icon>
                        <ChevronDownIcon className="size-3" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        className="overflow-hidden rounded-md border border-border bg-popover text-sm shadow-md"
                        role="listbox"
                      >
                        <Select.Viewport className="p-1">
                          {versions
                            .slice()
                            .reverse()
                            .map((v) => (
                              <Select.Item
                                key={v.id}
                                value={v.id}
                                className="flex cursor-pointer items-center gap-2 rounded p-1 text-foreground data-[highlighted]:bg-accent data-[highlighted]:outline-none"
                              >
                                <Select.ItemText>{v.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo || disabled || isStreaming}
                  className="inline-flex size-6 items-center justify-center rounded border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Undo last changes"
                  title="Undo last changes (switch to previous version)"
                >
                  <Undo2 className="size-3.5" />
                </button>
              )}

              <div className="relative flex shrink-0 has-[:disabled]:opacity-50">
                <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-500" />
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
                  className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-90"
                  aria-label={
                    isStreaming && onStop ? "Stop build" : "Send message"
                  }
                  title={
                    isStreaming && onStop ? "Stop the current build" : undefined
                  }
                >
                  <Spinner loading={isPending || screenshotLoading}>
                    <ArrowRightIcon />
                  </Spinner>
                </button>
              </div>
            </div>
          </div>

          <input
            id="screenshot"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleScreenshotUpload}
            className="hidden"
            ref={fileInputRef}
            disabled={!isScreenshotUploadAvailable}
          />
        </div>
      </form>
    </div>
  );
}
