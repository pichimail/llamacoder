/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LoadingButton from "@/components/loading-button";
import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import assert from "assert";
import { CheckIcon, ChevronDownIcon, Plus } from "lucide-react";
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
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(undefined);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  useLayoutEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    async function loadUploadConfig() {
      try {
        const res = await fetch("/api/blob-upload/config", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setBlobUploadConfigured(!!data.configured);
      } catch {
        if (!cancelled) setBlobUploadConfigured(false);
      }
    }
    loadUploadConfig();
    return () => { cancelled = true; };
  }, []);

  const isScreenshotUploadAvailable = blobUploadConfigured === true;

  const getModelDisplayLabel = (modelValue: string) => {
    const m = MODELS.find((x) => x.value === modelValue);
    if (!m) return modelValue;
    if (m.label.includes("GLM")) return "GLM 5 • AGENT MODE";
    if (m.label.includes("MiniMax")) return "MiniMax M2.7 (free)";
    if (m.label.includes("Qwen")) return "Qwen 3 Coder (free)";
    return m.label;
  };

  const modes = [
    { value: "ask" as const, label: "Ask", icon: "?" },
    { value: "plan" as const, label: "Plan", icon: "≡" },
    { value: "agent" as const, label: "Agent (Full Stack)", icon: "◇" },
  ];
  const currentMode = modes.find((m) => m.value === mode)!;

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isScreenshotUploadAvailable) return;

    setScreenshotLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blob-upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setScreenshotUrl(data.url);
      if (!prompt) setPrompt("Build this");
    } catch (err) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setScreenshotLoading(false);
    }
  };

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
            Turn your <span className="text-blue-500">idea</span><br className="hidden md:block" /> into an <span className="text-blue-500">app</span>
          </h1>

          <form
            className="relative w-full max-w-[820px] pt-6 lg:pt-12"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!prompt.trim()) return;

              startTransition(async () => {
                const res = await fetch("/api/create-chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt, model, mode, screenshotUrl }),
                });

                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  toast({ title: "Failed to create chat", description: err.error || "Unknown error", variant: "destructive" });
                  return;
                }

                const { chatId, lastMessageId } = await res.json();
                const streamPromise = fetch("/api/get-next-completion-stream-promise", {
                  method: "POST",
                  body: JSON.stringify({ messageId: lastMessageId, model }),
                }).then((r) => r.body!);

                setStreamPromise(streamPromise);
                router.push(`/chats/${chatId}`);
              });
            }}
          >
            <Fieldset>
              <div className="relative w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
                {/* Attached file badge */}
                {screenshotUrl && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1 text-sm">
                      <span>📎</span>
                      <span className="font-mono text-xs">{screenshotUrl.split("/").pop()?.slice(0, 20)}...</span>
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotUrl(undefined);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-1 text-muted-foreground hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Textarea - wider */}
                <textarea
                  ref={textareaRef}
                  placeholder="Describe what to build"
                  required
                  rows={4}
                  className="w-full resize-y bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[110px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                {/* Clean single-row toolbar - no extra backgrounds on icons */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    {/* + Attach */}
                    <label
                      htmlFor="file-upload"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleAttachment}
                      accept="image/*,.tsx,.jsx,.html,.json"
                      disabled={!isScreenshotUploadAvailable}
                    />

                    {/* Mode Selector */}
                    <Select.Root value={mode} onValueChange={(v) => setMode(v as Mode)}>
                      <Select.Trigger className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:bg-accent">
                        <span>{currentMode.icon} {currentMode.label}</span>
                        <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-[100] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
                          position="popper"
                          sideOffset={8}
                        >
                          <Select.Viewport className="p-1">
                            {modes.map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent data-[highlighted]:bg-accent"
                              >
                                <Select.ItemText>{m.icon} {m.label}</Select.ItemText>
                                {mode === m.value && <CheckIcon className="ml-auto h-4 w-4 text-blue-500" />}
                              </Select.Item>
                            ))}
                            <div className="my-1 h-px bg-border" />
                            <div className="px-3 py-2 text-xs text-muted-foreground hover:bg-accent rounded-lg cursor-pointer">
                              Configure Custom Agents...
                            </div>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    {/* Model Selector */}
                    <Select.Root value={model} onValueChange={setModel}>
                      <Select.Trigger className="flex h-9 min-w-[210px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:bg-accent">
                        <Select.Value>{getModelDisplayLabel(model)}</Select.Value>
                        <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-[100] max-h-[320px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl" position="popper" sideOffset={8}>
                          <Select.Viewport className="p-1">
                            {MODELS.filter((m) => !m.hidden).map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent data-[highlighted]:bg-accent"
                              >
                                <Select.ItemText>{m.label}</Select.ItemText>
                                {model === m.value && <CheckIcon className="ml-auto h-4 w-4 text-blue-500" />}
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  {/* Send Button - clean */}
                  <LoadingButton
                    type="submit"
                    disabled={screenshotLoading || !prompt.trim()}
                    className="flex h-9 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </LoadingButton>
                </div>
              </div>

              {/* Suggested Prompts */}
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((v) => (
                  <button
                    key={v.title}
                    type="button"
                    onClick={() => {
                      setPrompt(v.description);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                    className="rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground transition hover:bg-accent"
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

const Footer = memo(() => (
  <footer className="flex w-full flex-col items-center justify-between gap-y-2 px-5 pb-4 pt-6 text-center text-sm text-muted-foreground sm:flex-row">
    <div>Chinna-Coder</div>
    <div>Build production-ready apps from a single prompt.</div>
  </footer>
));

function LoadingMessage({ isHighQuality, screenshotUrl }: { isHighQuality: boolean; screenshotUrl?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Spinner />
        <span className="text-sm">
          {isHighQuality ? "Planning your app..." : screenshotUrl ? "Analyzing screenshot..." : "Generating your app..."}
        </span>
      </div>
    </div>
  );
}

export const runtime = "edge";
export const maxDuration = 60;
