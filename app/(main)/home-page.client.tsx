"use client";

import { HomeShell } from "@/components/home/home-shell";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
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
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
type ComposerAttachment = {
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
};

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
  "radial-gradient(circle at 50% 100%, rgba(255,122,0,0.96) 0%, rgba(255,122,0,0.78) 14%, rgba(255,151,203,0.72) 42%, rgba(198,165,214,0.72) 66%, rgba(174,193,231,0.82) 100%)";
const COMPOSER_MAX_WIDTH = "46rem";

function PresetChipsScroller({
  groups,
  activeTitles,
  onSelect,
}: {
  groups: typeof PROMPT_CHIP_GROUPS;
  activeTitles: Record<string, number>;
  onSelect: (group: (typeof PROMPT_CHIP_GROUPS)[number], direction?: "next" | "previous") => void;
}) {
  return (
    <div className="flex w-full max-w-[720px] items-center gap-2 overflow-hidden">
      <button
        type="button"
        aria-label="Previous prompt group"
        onClick={() => {
          const first = groups[0];
          if (first) onSelect(first, "previous");
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/35 text-slate-700 shadow-sm transition hover:bg-white/55"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/30">
        {groups.map((group) => (
          <button
            key={group.title}
            type="button"
            onClick={() => onSelect(group, "next")}
            className="snap-start whitespace-nowrap rounded-full border border-white/35 bg-white/45 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            title={group.prompts[activeTitles[group.title] ?? 0]}
          >
            {group.title}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Next prompt group"
        onClick={() => {
          const last = groups[groups.length - 1];
          if (last) onSelect(last, "next");
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/35 text-slate-700 shadow-sm transition hover:bg-white/55"
      >
        <ChevronRight className="size-3.5" />
      </button>
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

  const visibleModels = useMemo(() => availableModels ?? MODELS.filter((item) => !item.hidden), [availableModels]);

  useEffect(() => {
    const fromUrl = searchParams.get("prompt");
    if (fromUrl) setPrompt(fromUrl);
  }, [searchParams]);

  const handlePromptChipClick = useCallback((group: (typeof PROMPT_CHIP_GROUPS)[number], direction: "next" | "previous" = "next") => {
    setPromptChipIndexes((current) => {
      const currentIndex = current[group.title] ?? 0;
      const nextIndex = direction === "next"
        ? (currentIndex + 1) % group.prompts.length
        : (currentIndex - 1 + group.prompts.length) % group.prompts.length;
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
      if (screenshotUrl) {
        finalPrompt += `\n\nAttachment: ${screenshotUrl}`;
      }
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

  const composerFooter = (
    <div className="flex w-full items-center justify-between gap-2">
      <OptionDropdown
        value={mode}
        onValueChange={(value) => setMode(value as Mode)}
        aria-label="Select build mode"
        triggerLabel={<span className="capitalize">{mode}</span>}
        options={(["ask", "plan", "agent"] as const).map((item) => ({
          value: item,
          label: <span className="capitalize">{item}</span>,
        }))}
      />
      <OptionDropdown
        value={model}
        onValueChange={setModel}
        aria-label="Select model"
        triggerLabel={visibleModels.find((item) => item.value === model)?.label ?? model}
        options={visibleModels.map((item) => ({
          value: item.value,
          label: item.label,
          disabled: "available" in item ? !item.available : false,
        }))}
      />
    </div>
  );

  const showEnhance = prompt.trim().length > 0;

  const composerVoiceButton = (
    <VoiceInputButton
      onTranscript={(text) => setPrompt((current) => `${current}${current.trim() ? " " : ""}${text}`)}
      disabled={isSubmitting || screenshotLoading}
      className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      label="Dictate prompt"
    />
  );

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col text-foreground">
        <section
          id="hero"
          className="relative flex min-h-dvh flex-col"
          style={{ background: HERO_GRADIENT }}
        >
          <div className="relative flex flex-1 flex-col">
            <Header hideLogo />

            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-28 pt-0 md:pb-36">
              <div className="flex w-full max-w-[760px] -translate-y-8 flex-col items-center md:-translate-y-12">
                <TextColor className="mb-2 min-h-[4.25rem] md:min-h-[5.25rem]" />

                <div
                  id="prompt-composer"
                  className="relative mt-6 w-full"
                  style={{ ["--an-max-width" as any]: COMPOSER_MAX_WIDTH }}
                >
                  {mode === "plan" ? <PlanModePanel className="mb-3" /> : null}
                <PromptInputBox
                  value={prompt}
                  onValueChange={setPrompt}
                  onSend={handlePromptSend}
                  onRepoImported={(chatId) => router.push(`/chats/${chatId}?preview=1`)}
                    isLoading={isSubmitting}
                    disabled={isSubmitting || screenshotLoading}
                    placeholder="Describe what to build"
                    thinkEnabled={reasoningEnabled}
                    onThinkChange={setReasoningEnabled}
                    accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
                    toolbarEnd={
                      <div className="flex items-center gap-1.5">
                        {showEnhance ? (
                          <PromptRewriteButton
                            prompt={prompt}
                            mode={mode}
                            model={model}
                            onRewrite={setPrompt}
                            disabled={isSubmitting || screenshotLoading}
                            iconOnly
                          />
                        ) : null}
                        {composerVoiceButton}
                      </div>
                    }
                    footer={composerFooter}
                    shadcnEnabled={shadcnEnabled}
                    onShadcnChange={setShadcnEnabled}
                  />

                  <div className="mt-4">
                    <PresetChipsScroller
                      groups={PROMPT_CHIP_GROUPS}
                      activeTitles={promptChipIndexes}
                      onSelect={handlePromptChipClick}
                    />
                  </div>

                  {mode === "ask" ? (
                    <p className="mt-2 text-center text-xs text-slate-800/75">
                      Ask mode — best for questions, refinements, and targeted changes.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="featured-templates"
          className="relative z-10 mx-auto w-full max-w-5xl -mt-2 px-4 pb-8 pt-4 md:-mt-4"
        >
          <div className="rounded-[36px] border border-border/70 bg-background/95 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md md:px-5 md:py-5">
            <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Featured templates
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a responsive preview, then remix in the builder.
                </p>
              </div>
              <Link
                href="/gallery"
                className="text-xs text-muted-foreground transition hover:text-foreground"
              >
                View gallery
              </Link>
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
        }}
      />
    </HomeShell>
  );
}
