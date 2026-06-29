"use client";

import { HomeShell } from "@/components/home/home-shell";
import { useRouter } from "next/navigation";
import { use, useState, useRef, useTransition } from "react";
import { ArrowUp, Plus, Mic, Upload, Github, Search as SearchIcon, Brain, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Context } from "./providers";

type Mode = "ask" | "plan" | "agent";

const HERO_GRADIENT =
  "radial-gradient(125% 125% at 50% 101%, rgba(245,87,2,1) 10.5%, rgba(245,120,2,1) 16%, rgba(245,140,2,1) 17.5%, rgba(245,170,100,1) 25%, rgba(238,174,202,1) 40%, rgba(202,179,214,1) 65%, rgba(148,201,233,1) 100%)";

const PROMPT_CHIP_GROUPS = [
  {
    title: "SaaS landing",
    prompts: [
      "Build a premium SaaS landing page for a future-ready B2B product with a cinematic hero, GSAP-style scroll reveals, shadcn/ui pricing, animated feature cards, testimonials, waitlist capture, and a fully responsive dark visual system.",
      "Create a conversion-focused SaaS landing page with a real Three.js canvas hero, GSAP section choreography, magnetic product cards, sticky nav, pricing tiers, FAQ accordion, lead form, and polished mobile-first layout.",
      "Generate a launch-ready SaaS homepage with kinetic typography, animejs micro-sequences, a live-feeling product dashboard mockup, shadcn/ui components, proof placeholders, and backend-ready signup form wiring.",
    ],
  },
  {
    title: "GSAP / Three.js",
    prompts: [
      "Build an immersive 3D product showcase with a Three.js hero object, GSAP scroll sections, animated spec cards, responsive mobile fallbacks, and premium lighting controls.",
      "Create a cinematic portfolio site with Three.js particles, GSAP reveal timelines, magnetic hover cards, image galleries, contact CTA, and accessibility-safe reduced motion handling.",
      "Build a luxury launch page using GSAP pinned storytelling, Three.js ambient background, smooth section transitions, and a shadcn-style signup form.",
    ],
  },
  {
    title: "SMM marketing",
    prompts: [
      "Build a social media campaign planner with calendar, post queue, channel filters, approval workflow, content cards, campaign KPIs, and a mobile-first dashboard.",
      "Create an influencer outreach CRM with lead lists, campaign stages, contract status, and admin-ready mock data services.",
      "Generate a brand content studio with asset library, caption generator UI, schedule board, campaign briefs, and responsive shadcn-style management screens.",
    ],
  },
  {
    title: "Home automation",
    prompts: [
      "Build a smart home control app with rooms, device toggles, scene automation, energy usage charts, alerts, family permissions, and mobile-first controls.",
      "Create an IoT home dashboard with real-time-looking device states, automation rules, security cameras grid, climate controls, and responsive tablet layout.",
      "Generate a premium smart lighting app with room scenes, scheduling, color controls, automation history, and accessible switch/toggle states.",
    ],
  },
  {
    title: "Electric cars",
    prompts: [
      "Build an EV companion app with vehicle status, range planner, charging map, trip history, battery health, climate controls, and responsive mobile UI.",
      "Create a premium electric car configurator with model selection, color/wheel options, financing summary, comparison table, and animated preview panels.",
      "Generate an EV fleet dashboard with charger availability, vehicle assignments, energy cost charts, service alerts, and admin management views.",
    ],
  },
  {
    title: "E-commerce",
    prompts: [
      "Build a premium mobile-first fashion e-commerce app with collection browsing, product details, cart, checkout steps, wishlist, order tracking, and admin inventory screens.",
      "Create a D2C storefront with product filters, variant selector, reviews, cart drawer, account orders, promo codes, and responsive checkout UI.",
      "Generate a marketplace admin portal with sellers, product moderation, payouts, orders, analytics, support tickets, and role-based workflows.",
    ],
  },
  {
    title: "Full-stack SaaS",
    prompts: [
      "Build a production-ready SaaS dashboard scaffold with auth screens, project CRUD, team roles, billing plans, API key management, audit logs, and responsive shadcn UI.",
      "Create a multi-tenant workspace app with organizations, members, invitations, feature flags, settings, usage limits, and server-ready route structure.",
      "Generate a B2B SaaS admin console with users, plans, subscriptions, content management, logs, integrations, and production-safe empty/loading/error states.",
    ],
  },
];

function PresetChipsScroller({
  groups,
  activeTitles,
  onSelect,
}: {
  groups: typeof PROMPT_CHIP_GROUPS;
  activeTitles: Record<string, number>;
  onSelect: (group: (typeof PROMPT_CHIP_GROUPS)[number]) => void;
}) {
  return (
    <div className="mx-auto mt-4 w-full max-w-[620px] overflow-hidden px-0.5">
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const isActive = typeof activeTitles[group.title] === "number";
          return (
            <button
              key={group.title}
              type="button"
              onClick={() => onSelect(group)}
              className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 ${
                isActive
                  ? "border-white/60 bg-white/80 text-slate-950"
                  : "border-white/25 bg-white/10 text-white hover:border-white/50 hover:bg-white/20"
              }`}
            >
              {group.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PremiumPromptComposer({
  value,
  onValueChange,
  onSend,
  isLoading,
  disabled,
  mode,
  onModeChange,
  model,
  onModelChange,
  models,
  shadcnEnabled,
  onShadcnChange,
  reasoningEnabled,
  onReasoningChange,
  webSearchEnabled,
  onWebSearchChange,
  deepThinkingEnabled,
  onDeepThinkingChange,
  canvasEnabled,
  onCanvasChange,
  onAttach,
  attachmentReady,
  onImportGithub,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  disabled: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  model: string;
  onModelChange: (model: string) => void;
  models: any[];
  shadcnEnabled: boolean;
  onShadcnChange: (value: boolean) => void;
  reasoningEnabled: boolean;
  onReasoningChange: (value: boolean) => void;
  webSearchEnabled: boolean;
  onWebSearchChange: (value: boolean) => void;
  deepThinkingEnabled: boolean;
  onDeepThinkingChange: (value: boolean) => void;
  canvasEnabled: boolean;
  onCanvasChange: (value: boolean) => void;
  onAttach: () => void;
  attachmentReady?: boolean;
  onImportGithub: () => void;
}) {
  const hasValue = value.trim().length > 0 || attachmentReady;
  const selectedModel = models.find((item: any) => item.value === model) || { label: model };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 rounded-[28px] border border-white/10 bg-[#1f1f22] p-2 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
        {/* + Dropdown - all features here */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
            >
              <Plus size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-[#1f1f22] text-white border-white/10">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onAttach} className="gap-2">
              <Upload size={16} /> Upload file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportGithub} className="gap-2">
              <Github size={16} /> Import from GitHub
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Builder</DropdownMenuLabel>

            <DropdownMenuItem 
              onClick={() => onShadcnChange(!shadcnEnabled)} 
              className="flex justify-between"
            >
              <span className="flex items-center gap-2"><Palette size={16} /> shadcn UI</span>
              <input 
                type="checkbox" 
                checked={shadcnEnabled} 
                onChange={() => {}} 
                className="accent-white pointer-events-none" 
              />
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => onWebSearchChange(!webSearchEnabled)} 
              className="flex justify-between"
            >
              <span className="flex items-center gap-2"><SearchIcon size={16} /> Web search</span>
              <input 
                type="checkbox" 
                checked={webSearchEnabled} 
                onChange={() => {}} 
                className="accent-white pointer-events-none" 
              />
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => onDeepThinkingChange(!deepThinkingEnabled)} 
              className="flex justify-between"
            >
              <span className="flex items-center gap-2"><Brain size={16} /> Deep thinking</span>
              <input 
                type="checkbox" 
                checked={deepThinkingEnabled} 
                onChange={() => {}} 
                className="accent-white pointer-events-none" 
              />
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => onCanvasChange(!canvasEnabled)} 
              className="flex justify-between"
            >
              <span className="flex items-center gap-2"><span>🖼️</span> Canvas</span>
              <input 
                type="checkbox" 
                checked={canvasEnabled} 
                onChange={() => {}} 
                className="accent-white pointer-events-none" 
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Main input area - styled to match image */}
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!disabled && hasValue) onSend(value);
              }
            }}
            placeholder="Describe what to build"
            aria-label="Describe what to build"
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-2 py-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/60 disabled:opacity-60 min-h-[48px] max-h-[120px]"
          />
        </div>

        {/* Right side controls - mic, send, model */}
        <div className="flex items-center gap-1 pr-1">
          {/* Voice mic */}
          <button
            type="button"
            onClick={() => {
              // Voice input logic - integrate with existing if available
              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
              if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.onresult = (event: any) => {
                  const transcript = event.results[0][0].transcript;
                  onValueChange(value ? value + " " + transcript : transcript);
                };
                recognition.start();
              } else {
                alert("Voice input not supported in this browser");
              }
            }}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
          >
            <Mic size={16} />
          </button>

          {/* Send button */}
          <button
            onClick={() => onSend(value)}
            disabled={disabled || !hasValue}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow transition active:scale-[0.985] disabled:opacity-40"
          >
            {isLoading ? <span className="text-[10px]">...</span> : <ArrowUp size={16} />}
          </button>

          {/* Model selector - matches GLM 5 style */}
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/90 outline-none min-w-[70px]"
          >
            {models.map((m: any) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attachment ready indicator */}
      {attachmentReady && (
        <div className="mt-1 text-xs text-emerald-400">Attachment ready</div>
      )}
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const context = use(Context); // kept for compatibility if needed

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("agent");
  const [model, setModel] = useState("claude-3-5-sonnet");
  const [shadcnEnabled, setShadcnEnabled] = useState(true);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [promptChipIndexes, setPromptChipIndexes] = useState<Record<string, number>>({});

  const visibleModels = MODELS.filter((item) => !item.hidden);

  const handlePromptChipClick = (group: (typeof PROMPT_CHIP_GROUPS)[number]) => {
    const currentIndex = promptChipIndexes[group.title] ?? -1;
    const nextIndex = (currentIndex + 1) % group.prompts.length;
    setPromptChipIndexes((prev) => ({ ...prev, [group.title]: nextIndex }));
    setPrompt(group.prompts[nextIndex]);
  };

  const handlePromptSend = (value?: string) => {
    const cleanPrompt = (value ?? prompt).trim();
    if (!cleanPrompt) return;

    let finalPrompt = cleanPrompt + (screenshotUrl ? `\n\nAttachment: ${screenshotUrl}` : "");

    // Append dynamic features for backend
    const features = [];
    if (webSearchEnabled) features.push("web search enabled");
    if (deepThinkingEnabled) features.push("deep thinking mode");
    if (canvasEnabled) features.push("canvas mode");
    if (features.length > 0) {
      finalPrompt += `\n\n[Features: ${features.join(", ")}]`;
    }

    startTransition(async () => {
      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          model,
          quality: "high",
          mode,
          shadcn: shadcnEnabled,
          reasoning: reasoningEnabled,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.chatId || !data?.lastMessageId) {
        toast({
          title: "Could not start build",
          description: data?.error || "Please check auth/API configuration.",
          variant: "destructive",
        });
        return;
      }

      // Trigger the generation stream like in the new chat flow
      const streamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: data.lastMessageId,
          model,
          reasoning: reasoningEnabled,
          quality: "high",
        }),
      }).then(async (streamRes) => {
        if (!streamRes.ok) {
          throw new Error((await streamRes.text()) || "Failed to start generation");
        }
        if (!streamRes.body) throw new Error("No body on response");
        return streamRes.body;
      });

      void streamPromise.catch(() => undefined);
      context.setStreamPromise(streamPromise);

      router.push(`/chats/${data.chatId}?preview=1`);
    });
  };

  const handleAttachmentUpload = async (file: File) => {
    // Basic client-side preview for now (original had upload logic)
    const url = URL.createObjectURL(file);
    setScreenshotUrl(url);
    if (!prompt.trim()) {
      setPrompt("Build from the attached image/screenshot.");
    }
  };

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col text-foreground">
        <section
          id="hero"
          className="relative flex min-h-dvh overflow-hidden"
          style={{ background: HERO_GRADIENT }}
        >
          {/* subtle space and curved corners for the gradient background */}
          <div className="relative m-3 md:m-4 flex-1 overflow-hidden rounded-[28px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,122,0,0.34),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_34%)]" />

            <div className="relative flex min-h-dvh w-full flex-col">
              <Header hideLogo />

              <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-0 md:pb-32">
                <div className="flex w-full max-w-[760px] -translate-y-4 flex-col items-center md:-translate-y-8">
                  <div className="mb-4 min-h-[4.25rem] md:min-h-[5.25rem] flex items-center justify-center">
                    <h1 className="text-4xl font-semibold tracking-tighter md:text-[42px] text-center">
                      Let's build something, pichi
                    </h1>
                  </div>

                  <div id="prompt-composer" className="relative w-full">
                    <PremiumPromptComposer
                      value={prompt}
                      onValueChange={setPrompt}
                      onSend={handlePromptSend}
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                      mode={mode}
                      onModeChange={setMode}
                      model={model}
                      onModelChange={setModel}
                      models={visibleModels}
                      shadcnEnabled={shadcnEnabled}
                      onShadcnChange={setShadcnEnabled}
                      reasoningEnabled={reasoningEnabled}
                      onReasoningChange={setReasoningEnabled}
                      webSearchEnabled={webSearchEnabled}
                      onWebSearchChange={setWebSearchEnabled}
                      deepThinkingEnabled={deepThinkingEnabled}
                      onDeepThinkingChange={setDeepThinkingEnabled}
                      canvasEnabled={canvasEnabled}
                      onCanvasChange={setCanvasEnabled}
                      onAttach={() => fileInputRef.current?.click()}
                      attachmentReady={Boolean(screenshotUrl)}
                      onImportGithub={() => {
                        const url = window.prompt("Enter GitHub repo URL:");
                        if (url) {
                          setPrompt((prev) => prev + (prev ? " " : "") + `[Import from GitHub: ${url}]`);
                        }
                      }}
                    />

                    {/* Preset quick prompts */}
                    <PresetChipsScroller
                      groups={PROMPT_CHIP_GROUPS}
                      activeTitles={promptChipIndexes}
                      onSelect={handlePromptChipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="featured-templates" className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8 pt-5">
          <div className="rounded-[36px] border border-border/70 bg-background/95 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md md:px-5 md:py-5">
            <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Featured templates</h2>
                <p className="mt-1 text-sm text-muted-foreground">Open a responsive preview, then remix in the builder.</p>
              </div>
              <Link href="/gallery" className="text-xs text-muted-foreground transition hover:text-foreground">View gallery</Link>
            </div>
            <div className="mt-4">
              <FeaturedAppsGrid apps={[]} limit={6} compact />
            </div>
          </div>
        </section>
      </div>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleAttachmentUpload(file);
          if (event.currentTarget) event.currentTarget.value = "";
        }}
      />
    </HomeShell>
  );
}
