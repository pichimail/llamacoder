"use client";

import { HomeShell } from "@/components/home/home-shell";
import { TextColor } from "@/components/ui/text-color";
import { OptionDropdown } from "@/components/option-dropdown";
import { useRouter, useSearchParams } from "next/navigation";
import {
  use,
  useState,
  useTransition,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type RefObject,
} from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { Context } from "./providers";

import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
import { useAvailableModels } from "@/lib/use-available-models";
import type { FeaturedApp } from "@/lib/featured-apps";
import { PromptRewriteButton } from "@/components/prompt-rewrite-button";
import { PlanModePanel } from "@/components/plan-mode-panel";
import { VoiceInputButton } from "@/components/voice-input-button";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

type Mode = "ask" | "plan" | "agent";
type VisibleModel = (typeof MODELS)[number] & { available?: boolean };

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
      "Create an influencer outreach CRM with lead lists, campaign stages, contract status, message templates, performance cards, and admin-ready mock data services.",
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

const HERO_GRADIENT =
  "radial-gradient(125% 125% at 50% 101%, rgba(245,87,2,1) 10.5%, rgba(245,120,2,1) 16%, rgba(245,140,2,1) 17.5%, rgba(245,170,100,1) 25%, rgba(238,174,202,1) 40%, rgba(202,179,214,1) 65%, rgba(148,201,233,1) 100%)";
const COMPOSER_MAX_WIDTH = "760px";

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
    <div className="mx-auto mt-3 w-full max-w-[760px] overflow-hidden px-0.5">
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const isActive = typeof activeTitles[group.title] === "number";
          return (
            <button
              key={group.title}
              type="button"
              onClick={() => onSelect(group)}
              className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/80 ${
                isActive
                  ? "border-white/75 bg-white/82 text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                  : "border-white/42 bg-white/44 text-slate-800 hover:border-white/70 hover:bg-white/68 hover:text-slate-950"
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
  onAttach,
  attachmentReady,
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
  models: VisibleModel[];
  shadcnEnabled: boolean;
  onShadcnChange: (value: boolean) => void;
  reasoningEnabled: boolean;
  onReasoningChange: (value: boolean) => void;
  onAttach: () => void;
  attachmentReady?: boolean;
}) {
  const hasValue = value.trim().length > 0 || attachmentReady;
  const selectedModel = models.find((item) => item.value === model);

  return (
    <div className="w-full max-w-[760px]">
      <div className="rounded-[28px] border border-white/10 bg-[#1F2023]/96 p-2.5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
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
          rows={3}
          className="min-h-[76px] w-full resize-none rounded-[20px] bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-400 disabled:opacity-60"
        />

        {attachmentReady ? (
          <div className="mb-2 ml-1 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-100">
            Attachment ready
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onAttach}
              disabled={disabled}
              className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Attach file"
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
            </button>
            <OptionDropdown
              value={mode}
              onValueChange={(next) => onModeChange(next as Mode)}
              aria-label="Select build mode"
              triggerLabel={<span className="capitalize">{mode}</span>}
              triggerClassName="h-8 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs text-zinc-200 hover:bg-white/10"
              contentClassName="rounded-2xl"
              options={(["agent", "ask", "plan"] as const).map((item) => ({
                value: item,
                label: <span className="capitalize">{item}</span>,
              }))}
            />
            <OptionDropdown
              value={model}
              onValueChange={onModelChange}
              aria-label="Select model"
              triggerLabel={<span className="block max-w-[104px] truncate sm:max-w-[150px]">{selectedModel?.label ?? model}</span>}
              triggerClassName="h-8 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs text-zinc-200 hover:bg-white/10"
              contentClassName="max-h-[320px] overflow-y-auto rounded-2xl"
              options={models.map((item) => ({
                value: item.value,
                label: item.available === false ? `${item.label} (needs key)` : item.label,
                disabled: item.available === false,
              }))}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {value.trim() ? (
              <PromptRewriteButton
                prompt={value}
                mode={mode}
                model={model}
                onRewrite={onValueChange}
                disabled={disabled}
                iconOnly
              />
            ) : null}
            <button
              type="button"
              onClick={() => onReasoningChange(!reasoningEnabled)}
              className={`hidden h-8 rounded-full border px-3 text-xs transition sm:inline-flex ${
                reasoningEnabled
                  ? "border-violet-300/40 bg-violet-300/15 text-violet-100"
                  : "border-white/10 bg-white/[0.055] text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-pressed={reasoningEnabled}
            >
              Think
            </button>
            <button
              type="button"
              onClick={() => onShadcnChange(!shadcnEnabled)}
              className={`hidden h-8 rounded-full border px-3 text-xs transition sm:inline-flex ${
                shadcnEnabled
                  ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.055] text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-pressed={shadcnEnabled}
            >
              shadcn
            </button>
            <VoiceInputButton
              onTranscript={(text) => onValueChange(`${value}${value.trim() ? " " : ""}${text}`)}
              disabled={disabled}
              className="size-8 rounded-full border-white/10 bg-white/[0.055] text-zinc-300 hover:bg-white/10 hover:text-white"
              label="Dictate prompt"
            />
            <button
              type="button"
              onClick={() => onSend(value)}
              disabled={disabled || !hasValue}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white text-[#1F2023] shadow-sm transition hover:-translate-y-px hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500"
              aria-label={isLoading ? "Generating" : "Send prompt"}
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePageClient({ featuredApps }: { featuredApps: FeaturedApp[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = use(Context);
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [model, setModel] = useState(MODELS.find((item) => !item.hidden)?.value || "zai-org/GLM-5");
  const [mode, setMode] = useState<Mode>("agent");
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [shadcnEnabled, setShadcnEnabled] = useState(true);
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [promptChipIndexes, setPromptChipIndexes] = useState<Record<string, number>>({});
  const availableModels = useAvailableModels();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleModels = useMemo<VisibleModel[]>(
    () => (availableModels ?? MODELS.filter((item) => !item.hidden)) as VisibleModel[],
    [availableModels],
  );

  useEffect(() => {
    const fromUrl = searchParams.get("prompt");
    if (fromUrl) setPrompt(fromUrl);
  }, [searchParams]);

  const handlePromptChipClick = useCallback((group: (typeof PROMPT_CHIP_GROUPS)[number]) => {
    setPromptChipIndexes((current) => {
      const nextIndex = ((current[group.title] ?? -1) + 1) % group.prompts.length;
      setPrompt(group.prompts[nextIndex]);
      return { ...current, [group.title]: nextIndex };
    });
  }, []);

  const handleAttachmentUpload = async (file: File) => {
    setScreenshotLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Attachment upload failed");
      const payload = (await response.json()) as { url?: string };
      if (!payload.url) throw new Error("No attachment URL returned");
      setScreenshotUrl(payload.url);
      if (!prompt.trim()) setPrompt("Build from this attachment");
      toast({ title: "Attachment ready" });
    } catch (error) {
      setScreenshotUrl(undefined);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload attachment.",
        variant: "destructive",
      });
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handlePromptSend = (value: string) => {
    const cleanPrompt = value.trim();
    if (!cleanPrompt && !screenshotUrl) return;

    startTransition(async () => {
      let finalPrompt = cleanPrompt || "Build from the attached file.";
      if (screenshotUrl) finalPrompt += `\n\nAttachment: ${screenshotUrl}`;

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
      const data = await response.json();
      if (!response.ok || !data?.id) {
        toast({
          title: "Could not start build",
          description: data?.error || "Please check auth/API configuration.",
          variant: "destructive",
        });
        return;
      }
      context.setStreamPromise(data.streamPromise);
      router.push(`/chats/${data.id}?preview=1`);
    });
  };

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col text-foreground">
        <section
          id="hero"
          className="relative flex min-h-dvh overflow-hidden rounded-none lg:rounded-[28px]"
          style={{ background: HERO_GRADIENT }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,122,0,0.34),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_34%)]" />
          <div className="relative flex min-h-dvh w-full flex-col">
            <Header hideLogo />

            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-0 md:pb-32">
              <div className="flex w-full max-w-[760px] -translate-y-4 flex-col items-center md:-translate-y-8">
                <TextColor className="mb-4 min-h-[4.25rem] md:min-h-[5.25rem]" />

                <div id="prompt-composer" className="relative w-full" style={{ ["--an-max-width" as any]: COMPOSER_MAX_WIDTH }}>
                  {mode === "plan" ? <PlanModePanel className="mb-3" /> : null}
                  <PremiumPromptComposer
                    value={prompt}
                    onValueChange={setPrompt}
                    onSend={handlePromptSend}
                    isLoading={isSubmitting || screenshotLoading}
                    disabled={isSubmitting || screenshotLoading}
                    mode={mode}
                    onModeChange={setMode}
                    model={model}
                    onModelChange={setModel}
                    models={visibleModels}
                    shadcnEnabled={shadcnEnabled}
                    onShadcnChange={setShadcnEnabled}
                    reasoningEnabled={reasoningEnabled}
                    onReasoningChange={setReasoningEnabled}
                    onAttach={() => fileInputRef.current?.click()}
                    attachmentReady={Boolean(screenshotUrl)}
                  />

                  <PresetChipsScroller groups={PROMPT_CHIP_GROUPS} activeTitles={promptChipIndexes} onSelect={handlePromptChipClick} />

                  {mode === "ask" ? (
                    <p className="mt-2 text-center text-xs text-slate-900/80">
                      Ask mode — best for questions, refinements, and targeted changes.
                    </p>
                  ) : null}
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
              <FeaturedAppsGrid apps={featuredApps} limit={6} compact />
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
