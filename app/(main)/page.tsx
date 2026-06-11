/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import LoadingButton from "@/components/loading-button";
import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import assert from "assert";
import { CheckIcon, ChevronDownIcon, Plus, Settings } from "lucide-react";
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
import HyperspeedBackground from "@/components/hyperspeed-background";
import BallpitBackground from "@/components/ballpit-background";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

type Mode = "ask" | "plan" | "agent";

export default function Home() {
  const { setStreamPromise } = use(Context);
  const { theme } = useTheme();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    MODELS.find((m) => !m.hidden)?.value || MODELS[0].value,
  );
  const [mode, setMode] = useState<Mode>("agent");
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

  // Full display label for Cursor-style
  const getModelDisplayLabel = (modelValue: string) => {
    const modelInfo = MODELS.find((m) => m.value === modelValue);
    if (!modelInfo) return modelValue;

    if (modelInfo.label.includes("GLM")) return "GLM 5 • AGENT MODE";
    if (modelInfo.label.includes("MiniMax")) return "MiniMax M2.7 (free)";
    if (modelInfo.label.includes("Qwen")) return "Qwen 3 Coder (free)";
    return modelInfo.label;
  };

  const qualityOptions = useMemo(
    () => [
      { value: "low", label: "Low quality [faster]" },
      { value: "high", label: "High quality [slower]" },
    ],
    [],
  );

  const modes: { value: Mode; label: string; icon: string }[] = [
    { value: "ask", label: "Ask", icon: "?" },
    { value: "plan", label: "Plan", icon: "≡" },
    { value: "agent", label: "Agent (Full Stack)", icon: "◇" },
  ];

  const currentMode = modes.find((m) => m.value === mode) || modes[2];

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
                    mode,
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
                  return;
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
              <div className="relative flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card pb-14 shadow-sm" role="form" aria-label="Create new app from prompt">
                {/* Top: Attached file badge (sonner.tsx style) */}
                {screenshotUrl && (
                  <div className="mx-4 mt-4 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-sm">
                      <span className="text-blue-400">📄</span>
                      <span>sonner.tsx</span>
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotUrl(undefined);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative px-4 pt-4">
                  <textarea
                    ref={textareaRef}
                    placeholder="Describe what to build"
                    required
                    name="prompt"
                    rows={3}
                    className="w-full resize-y min-h-[80px] bg-transparent px-1 py-2 text-lg placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
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

                {/* Bottom Toolbar - Single unified row */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* + Attachment Button */}
                    <label
                      htmlFor="screenshot"
                      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground ${!isScreenshotUploadAvailable ? "cursor-not-allowed opacity-50" : ""}`}
                      title={isScreenshotUploadAvailable ? "Attach screenshot" : "Attach disabled"}
                    >
                      <Plus className="size-4" />
                    </label>

                    {/* Mode Selector using existing Radix Select */}
                    <Select.Root value={mode} onValueChange={(val) => setMode(val as Mode)}>
                      <Select.Trigger className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                        <span>{currentMode.icon} {currentMode.label}</span>
                        <ChevronDownIcon className="size-3 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md border border-border bg-popover shadow-md z-50">
                          <Select.Viewport className="p-1">
                            {modes.map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent data-[highlighted]:bg-accent"
                              >
                                <Select.ItemText>{m.icon} {m.label}</Select.ItemText>
                                {mode === m.value && <CheckIcon className="ml-auto size-3 text-blue-500" />}
                              </Select.Item>
                            ))}
                            <div className="my-1 h-px bg-border" />
                            <div className="px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-accent rounded">
                              Configure Custom Agents...
                            </div>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    {/* Model Selector - shows full name like NVIDIA example */}
                    <Select.Root name="model" value={model} onValueChange={setModel}>
                      <Select.Trigger className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent min-w-[220px]">
                        <Select.Value>
                          {getModelDisplayLabel(model)}
                        </Select.Value>
                        <ChevronDownIcon className="size-3 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md border border-border bg-popover shadow-md z-50 max-h-[300px]">
                          <Select.Viewport className="p-1">
                            {MODELS.filter((m) => !m.hidden).map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent data-[highlighted]:bg-accent"
                              >
                                <Select.ItemText>{m.label}</Select.ItemText>
                                {model === m.value && <CheckIcon className="ml-auto size-3 text-blue-500" />}
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    {/* Medium label */}
                    <div className="px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md bg-background">
                      Medium
                    </div>

                    {/* Settings Gear */}
                    <button type="button" className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Settings className="size-4" />
                    </button>
                  </div>

                  {/* Send Button */}
                  <div className="relative flex shrink-0 has-[:disabled]:opacity-50">
                    <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-500" />
                    <LoadingButton
                      className="relative inline-flex size-9 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:opacity-90"
                      type="submit"
                      disabled={screenshotLoading || prompt.length === 0}
                    >
                      <ArrowRightIcon className="size-4" />
                    </LoadingButton>
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
                      setTimeout(() => {
                        textareaRef.current?.focus();
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.value.length;
                          textareaRef.current.selectionEnd = textareaRef.current.value.length;
                        }
                      }, 0);
                    }}
                    className="rounded bg-muted px-2.5 py-1.5 text-xs tracking-[0%] text-foreground transition-colors hover:bg-accent"
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
