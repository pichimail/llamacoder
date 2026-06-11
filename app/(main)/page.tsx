/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import LoadingButton from "@/components/loading-button";
import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import assert from "assert";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  use,
  useState,
  useRef,
  useTransition,
  useLayoutEffect,
  useEffect,
  useMemo,
  memo,
} from "react";

import { Context } from "./providers";
import Header from "@/components/header";
import UploadIcon from "@/components/icons/upload-icon";
import HyperspeedBackground from "@/components/hyperspeed-background";
import BallpitBackground from "@/components/ballpit-background";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

export default function Home() {
  const { setStreamPromise } = use(Context);
  const { theme } = useTheme();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    MODELS.find((m) => !m.hidden)?.value || MODELS[0].value,
  );
  const [quality, setQuality] = useState("low");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<boolean | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

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

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

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

    if (prompt.length === 0) setPrompt("Build this");
    setQuality("low");
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
        "Screenshot upload is not available right now. You can still generate the app without an attachment.",
      );
    } finally {
      setScreenshotLoading(false);
    }
  };

  const textareaResizePrompt = useMemo(
    () =>
      prompt
        .split("\n")
        .map((text) => (text === "" ? "a" : text))
        .join("\n"),
    [prompt],
  );

  return (
    <div className="relative flex min-h-dvh grow flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className={`${theme === "dark" && mounted ? "block" : "hidden"}`}>
          <HyperspeedBackground />
        </div>
        <div className={`${theme === "dark" && mounted ? "hidden" : "block"}`}>
          <BallpitBackground />
        </div>
      </div>

      <div className="relative z-10 isolate flex h-full grow flex-col">
        <Header />

        <div className="mt-10 flex grow flex-col items-center px-4 lg:mt-16">
          <h1 className="mt-4 text-balance text-center text-4xl leading-none text-foreground md:text-[64px] lg:mt-8">
            Turn your <span className="text-blue-500">idea</span>
            <br className="hidden md:block" /> into an{" "}
            <span className="text-blue-500">app</span>
          </h1>

          <form
            className="relative w-full max-w-2xl pt-6 lg:pt-12"
            action={async (formData) => {
              startTransition(async () => {
                const { prompt, model, quality } = Object.fromEntries(formData);

                assert.ok(typeof prompt === "string");
                assert.ok(typeof model === "string");
                assert.ok(quality === "high" || quality === "low");

                const response = await fetch("/api/create-chat", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    prompt,
                    model,
                    quality,
                    screenshotUrl,
                  }),
                });

                if (!response.ok) {
                  let message = "Failed to create chat";
                  try {
                    const err = await response.json();
                    if (err?.error) message = err.error;
                  } catch {}
                  toast({
                    title: "Failed to create chat",
                    description: message,
                    variant: "destructive",
                  });
                  return; // Graceful exit instead of throwing (prevents uncaught error + stuck loading state)
                }

                const { chatId, lastMessageId } = await response.json();

                const streamPromise = fetch(
                  "/api/get-next-completion-stream-promise",
                  {
                    method: "POST",
                    body: JSON.stringify({ messageId: lastMessageId, model }),
                  },
                ).then((res) => {
                  if (!res.body) {
                    throw new Error("No body on response");
                  }
                  return res.body;
                });

                startTransition(() => {
                  setStreamPromise(streamPromise);
                  router.push(`/chats/${chatId}`);
                });
              });
            }}
          >
            <Fieldset>
              <div className="relative flex w-full max-w-2xl rounded-xl border border-border bg-card pb-10 shadow-sm" role="form" aria-label="Create new app from prompt">
                <div className="w-full">
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
                        className="absolute -right-3 -top-4 left-14 z-10 size-5 rounded-full bg-background text-foreground shadow hover:text-muted-foreground" aria-label="Remove attached screenshot"
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
                  <div className="relative">
                    <div className="p-3">
                      <p className="invisible w-full whitespace-pre-wrap">
                        {textareaResizePrompt}
                      </p>
                    </div>
                    <textarea
                      ref={textareaRef}
                      placeholder="Build me a budgeting app..."
                      required
                      name="prompt"
                      rows={2}
                      className="peer absolute inset-0 w-full resize-none bg-transparent px-4 py-3 placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50" aria-label="App description prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onPaste={(e) => {
                        // Clean up pasted text
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData("text");

                        // Normalize line endings and clean up whitespace
                        const cleanedText = pastedText
                          .replace(/\r\n/g, "\n") // Convert Windows line endings
                          .replace(/\r/g, "\n") // Convert old Mac line endings
                          .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
                          .trim(); // Remove leading/trailing whitespace

                        // Insert the cleaned text at cursor position
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newValue =
                          prompt.slice(0, start) +
                          cleanedText +
                          prompt.slice(end);

                        setPrompt(newValue);

                        // Set cursor position after the pasted text
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
                </div>
                <div className="absolute bottom-2 left-3 right-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Select.Root
                      name="model"
                      value={model}
                      onValueChange={setModel}
                    >
                      <Select.Trigger className="inline-flex items-center gap-1 rounded-md p-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Select AI model">
                        <Select.Value aria-label={model}>
                          <span>{selectedModel?.label}</span>
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDownIcon className="size-3" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md border border-border bg-popover shadow-md" role="listbox">
                          <Select.Viewport className="space-y-1 p-2">
                            {MODELS.filter((m) => !m.hidden).map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm text-foreground data-[highlighted]:bg-accent data-[highlighted]:outline-none" role="option"
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

                    <div className="h-4 w-px bg-border max-sm:hidden" aria-hidden="true" />

                    <Select.Root
                      name="quality"
                      value={quality}
                      onValueChange={setQuality}
                    >
                      <Select.Trigger className="inline-flex items-center gap-1 rounded p-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Select quality">
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
                        <Select.Content className="overflow-hidden rounded-md border border-border bg-popover shadow-md" role="listbox">
                          <Select.Viewport className="space-y-1 p-2">
                            {qualityOptions.map((q) => (
                              <Select.Item
                                key={q.value}
                                value={q.value}
                                className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm text-foreground data-[highlighted]:bg-accent data-[highlighted]:outline-none" role="option"
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
                    <div className="h-4 w-px bg-border max-sm:hidden" aria-hidden="true" />
                    <div>
                      <label
                        htmlFor="screenshot"
                        className={`flex gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline ${!isScreenshotUploadAvailable ? "cursor-not-allowed opacity-50 hover:no-underline" : "cursor-pointer"}`} aria-label="Attach screenshot or design image"
                      >
                        <div className="flex size-6 items-center justify-center rounded bg-foreground text-background hover:opacity-90" aria-hidden="true">
                          <UploadIcon className="size-4" />
                        </div>
                        <div className="flex items-center justify-center transition">
                          {isScreenshotUploadAvailable ? "Attach" : "Attach disabled"}
                        </div>
                      </label>
                      <input
                        // name="screenshot"
                        id="screenshot"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                        ref={fileInputRef}
                        disabled={!isScreenshotUploadAvailable}
                      />
                    </div>
                  </div>

                  <div className="relative flex shrink-0 has-[:disabled]:opacity-50">
                    <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-500" />

                    <LoadingButton
                      className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-90"
                      type="submit"
                      disabled={screenshotLoading || prompt.length === 0}
                    >
                      <ArrowRightIcon />
                    </LoadingButton>
                  </div>
                </div>

                {isPending && (
                  <LoadingMessage
                    isHighQuality={quality === "high"}
                    screenshotUrl={screenshotUrl}
                  />
                )}
              </div>
              <div className="mt-4 flex w-full flex-wrap justify-between gap-2.5">
                {SUGGESTED_PROMPTS.map((v) => (
                  <button
                    key={v.title}
                    type="button"
                    onClick={() => {
                      setPrompt(v.description);
                      // Refocus the textarea after setting the prompt
                      setTimeout(() => {
                        textareaRef.current?.focus();
                        // Position cursor at the end
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart =
                            textareaRef.current.value.length;
                          textareaRef.current.selectionEnd =
                            textareaRef.current.value.length;
                        }
                      }, 0);
                    }}
                    className="rounded bg-muted px-2.5 py-1.5 text-xs tracking-[0%] text-foreground transition-colors hover:bg-accent" role="button"
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </Fieldset>
          </form>
        </div>

        <Footer />
      </div>
    </div>
  );
}

const Footer = memo(() => {
  return (
    <footer className="flex w-full flex-col items-center justify-between space-y-3 px-5 pb-3 pt-5 text-center sm:flex-row sm:pt-2">
      <div className="font-medium text-foreground">Chinna-Coder</div>
      <div className="text-sm text-muted-foreground">Build apps from a single prompt.</div>
    </footer>
  );
});

function LoadingMessage({
  isHighQuality,
  screenshotUrl,
}: {
  isHighQuality: boolean;
  screenshotUrl: string | undefined;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background px-1 py-3 md:px-3" role="status" aria-live="polite">
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <span className="animate-pulse text-balance text-center text-sm md:text-base">
          {isHighQuality
            ? `Coming up with project plan, may take 15 seconds...`
            : screenshotUrl
              ? "Analyzing your screenshot..."
              : `Creating your app...`}
        </span>

        <Spinner />
      </div>
    </div>
  );
}

export const runtime = "edge";
export const maxDuration = 60;
