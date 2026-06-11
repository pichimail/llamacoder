/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LoadingButton from "@/components/loading-button";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState, useRef, useTransition, useLayoutEffect, useEffect, memo } from "react";
import { Context } from "./providers";
import Header from "@/components/header";
import Hyperspeed from "@/components/Hyperspeed";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

type Mode = "ask" | "plan" | "agent";

export default function Home() {
  const { setStreamPromise } = use(Context);
  const { theme } = useTheme();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS.find((m) => !m.hidden)?.value || MODELS[0].value);
  const [mode, setMode] = useState<Mode>("agent");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(undefined);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => { if (textareaRef.current) textareaRef.current.focus(); }, []);
  useLayoutEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/blob-upload/config", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setBlobUploadConfigured(!!data.configured);
        }
      } catch { if (!cancelled) setBlobUploadConfigured(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const isUploadAvailable = blobUploadConfigured === true;

  const getModelLabel = (val: string) => MODELS.find(x => x.value === val)?.label || val;

  const modes = [
    { value: "ask" as const, label: "Ask", icon: "?" },
    { value: "plan" as const, label: "Plan", icon: "≡" },
    { value: "agent" as const, label: "Agent (Full Stack)", icon: "◇" },
  ];
  const currentMode = modes.find(m => m.value === mode)!;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isUploadAvailable) return;
    setScreenshotLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/blob-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setScreenshotUrl(data.url);
      if (!prompt.trim()) setPrompt("Build this from the attached file");
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setScreenshotLoading(false); }
  };

  // Four preset options for Hyperspeed (React Bits style)
  const hyperspeedOptions = {
    distortion: "LongRaceDistortion",
    length: 400,
    roadWidth: 10,
    islandWidth: 5,
    lanesPerRoad: 2,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 50,
    lightPairsPerRoadWay: 70,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5] as [number, number],
    lightStickHeight: [1.3, 1.7] as [number, number],
    movingAwaySpeed: [60, 80] as [number, number],
    movingCloserSpeed: [-120, -160] as [number, number],
    carLightsLength: [20, 60] as [number, number],
    carLightsRadius: [0.05, 0.14] as [number, number],
    carWidthPercentage: [0.3, 0.5] as [number, number],
    carShiftX: [-0.2, 0.2] as [number, number],
    carFloorSeparation: [0.05, 1] as [number, number],
    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x000000,
      shoulderLines: 0x131318,
      brokenLines: 0x131318,
      leftCars: [0xff5f73, 0xe74d60, 0xff102a],
      rightCars: [0xa4e3e6, 0x80d1d4, 0x53c2c6],
      sticks: 0xa4e3e6,
    },
  };

  return (
    <div className="relative flex min-h-dvh grow flex-col bg-background text-foreground">
      {/* New React Bits Hyperspeed as full background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Hyperspeed effectOptions={hyperspeedOptions} interactive={true} />
      </div>

      <div className="relative z-10 isolate flex h-full grow flex-col">
        <Header />

        <div className="mt-8 flex grow flex-col items-center px-4 lg:mt-14">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Turn your <span className="text-blue-500">idea</span> into an <span className="text-blue-500">app</span>
          </h1>

          <form className="relative mt-8 w-full max-w-[860px]" onSubmit={async (e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            startTransition(async () => {
              const res = await fetch("/api/create-chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model, mode, screenshotUrl }),
              });
              if (!res.ok) { toast({ title: "Error", variant: "destructive" }); return; }
              const { chatId } = await res.json();
              router.push(`/chats/${chatId}`);
            });
          }}>
            <Fieldset>
              <div className="relative w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
                {screenshotUrl && (
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1">
                      <span>📎</span>
                      <span className="font-mono text-xs truncate max-w-[160px]">{screenshotUrl.split("/").pop()}</span>
                      <button type="button" onClick={() => setScreenshotUrl(undefined)} className="text-muted-foreground hover:text-red-500">×</button>
                    </div>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  placeholder="Describe what to build"
                  required
                  rows={4}
                  className="w-full resize-y bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[120px]"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                />

                <div className="mt-4 flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="file" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-800 hover:text-foreground transition-colors">
                      <Plus className="h-4 w-4" />
                    </label>
                    <input id="file" type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.tsx,.jsx,.html" disabled={!isUploadAvailable} />

                    <Select.Root value={mode} onValueChange={v => setMode(v as Mode)}>
                      <Select.Trigger className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors">
                        <span>{currentMode.icon} {currentMode.label}</span>
                        <ChevronDownIcon className="h-3 w-3 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-[999] overflow-hidden rounded-lg border border-border bg-popover shadow-xl text-sm" sideOffset={4}>
                          <Select.Viewport className="p-1">
                            {modes.map(m => (
                              <Select.Item key={m.value} value={m.value} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 hover:bg-accent data-[highlighted]:bg-accent">
                                <Select.ItemText>{m.icon} {m.label}</Select.ItemText>
                                {mode === m.value && <CheckIcon className="ml-auto h-3.5 w-3.5 text-blue-500" />}
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    <Select.Root value={model} onValueChange={setModel}>
                      <Select.Trigger className="flex h-8 min-w-[180px] items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors">
                        <Select.Value>{getModelLabel(model)}</Select.Value>
                        <ChevronDownIcon className="h-3 w-3 opacity-60" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-[999] max-h-[320px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl text-sm" sideOffset={4}>
                          <Select.Viewport className="p-1">
                            {MODELS.filter(m => !m.hidden).map(m => (
                              <Select.Item key={m.value} value={m.value} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 hover:bg-accent data-[highlighted]:bg-accent">
                                <Select.ItemText>{m.label}</Select.ItemText>
                                {model === m.value && <CheckIcon className="ml-auto h-3.5 w-3.5 text-blue-500" />}
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <LoadingButton type="submit" disabled={screenshotLoading || !prompt.trim()} className="flex h-8 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    <ArrowRightIcon className="h-4 w-4" />
                  </LoadingButton>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map(v => (
                  <button key={v.title} type="button" onClick={() => { setPrompt(v.description); setTimeout(() => textareaRef.current?.focus(), 0); }} className="rounded-md bg-muted px-3 py-1 text-xs text-foreground hover:bg-zinc-800 transition-colors">
                    {v.title}
                  </button>
                ))}
              </div>
            </Fieldset>
          </form>
        </div>

        <footer className="mt-auto flex w-full justify-center pb-6 text-xs text-muted-foreground">Chinna-Coder — Build production apps from a prompt</footer>
      </div>
    </div>
  );
}

export const runtime = "edge";
export const maxDuration = 60;
