/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import Hyperspeed from "@/components/Hyperspeed";
import { hyperspeedPresets } from "@/components/HyperSpeedPresets";
import LiquidEther from "@/components/LiquidEther";
import LoadingButton from "@/components/loading-button";
import StaggeredMenu from "@/components/StaggeredMenu";
import SpotlightCard from "@/components/SpotlightCard";
import BorderGlow from "@/components/BorderGlow";
import BlurText from "@/components/BlurText";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  useRef,
  useTransition,
  useEffect,
} from "react";
import { useTheme } from "@/components/theme-provider";

import Header from "@/components/header";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

type Mode = "ask" | "plan" | "agent";

const HEADLINES = [
  "Build apps at hyperspeed",
  "Warp prompts into production",
  "Forge code at light velocity",
  "Neon synthesis of full-stack apps",
  "Synthesize vision at warp speed",
];

const staggeredMenuItems = [
  { label: "Home", ariaLabel: "Go to home section", link: "/" },
  { label: "Build", ariaLabel: "Go to the prompt composer", link: "#prompt-composer" },
  { label: "Examples", ariaLabel: "Go to prompt examples", link: "#examples" },
];

const staggeredSocialItems = [
  {
    label: "GitHub",
    link: "https://github.com/pichimail/llamacoder",
  },
];

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    MODELS.find((m) => !m.hidden)?.value || MODELS[0].value,
  );
  const [mode, setMode] = useState<Mode>("agent");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<
    boolean | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [headlineIndex, setHeadlineIndex] = useState(0);

  const [, startTransition] = useTransition();

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 4800);
    return () => clearInterval(interval);
  }, []);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const showHyperspeed = mounted && resolvedTheme === "dark";
  const showLiquidEther = mounted && resolvedTheme === "light";

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

  return (
    <div className="relative flex min-h-dvh grow flex-col bg-background text-foreground">
      {showHyperspeed && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Hyperspeed
            effectOptions={hyperspeedPresets.four}
            interactive={true}
            interactiveScope="page"
          />
        </div>
      )}

      {showLiquidEther && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <LiquidEther
            colors={["#5227FF", "#FF9FFC", "#B497CF"]}
            mouseForce={4}
            cursorSize={190}
            isViscous={false}
            viscous={1}
            iterationsViscous={1}
            iterationsPoisson={1}
            resolution={0.2}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.85}
            autoIntensity={0.5}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
            style={{ pointerEvents: "none" }}
          />
        </div>
      )}

      <StaggeredMenu
        className="[&_.staggered-menu-header]:top-16 [&_.staggered-menu-header]:justify-start [&_.sm-logo]:hidden"
        position="left"
        isFixed={true}
        logoUrl="/chinna-coder-logo-dark.svg"
        items={staggeredMenuItems}
        socialItems={staggeredSocialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={["#0f172a", "#111827", "#1f2937"]}
        accentColor="#60a5fa"
      />

      <div className="relative z-10 isolate flex h-full grow flex-col">
        <Header />

        <div className="mt-8 flex grow flex-col items-center px-4 lg:mt-14">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight md:text-6xl min-h-[4.25rem] md:min-h-[5.25rem]">
            <BlurText
              key={headlineIndex}
              text={HEADLINES[headlineIndex]}
              animateBy="words"
              direction="top"
              delay={110}
              stepDuration={0.4}
              threshold={0.05}
              className="hyperspeed-gradient-text"
            />
          </h1>

          <form id="prompt-composer" className="relative mt-8 w-full max-w-[820px]" onSubmit={async (e) => {
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
              <BorderGlow
                className="w-full"
                edgeSensitivity={28}
                glowColor="195 85 70"
                backgroundColor="#0a0a0c"
                borderRadius={20}
                glowRadius={30}
                glowIntensity={1.15}
                coneSpread={22}
                animated={false}
                colors={["#ff3366", "#33ff99", "#3366ff"]}
                fillOpacity={0.55}
              >
                <SpotlightCard
                  className="!bg-transparent !border-transparent !shadow-none !rounded-[20px] !p-4"
                  spotlightColor="rgba(0, 229, 255, 0.22)"
                >
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
                    className="w-full resize-y bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[92px]"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  />

                <div className="mt-3 flex items-center justify-between pt-2">
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
                        <Select.Content
                          className="z-[999] overflow-hidden rounded-lg border border-border bg-popover shadow-xl text-sm"
                          position="popper"
                          sideOffset={4}
                        >
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
                        <Select.Content
                          className="z-[999] max-h-[320px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl text-sm"
                          position="popper"
                          sideOffset={4}
                        >
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
              </SpotlightCard>
            </BorderGlow>

              <div id="examples" className="mt-3 flex flex-wrap gap-2 scroll-mt-24">
                {SUGGESTED_PROMPTS.map(v => (
                  <button key={v.title} type="button" onClick={() => { setPrompt(v.description); setTimeout(() => textareaRef.current?.focus(), 0); }} className="rounded-md bg-muted px-3 py-1 text-xs text-foreground hover:bg-zinc-800 hover:text-[#8b7cf0] hover:scale-[1.03] active:scale-[0.975] transition-all duration-150">
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
