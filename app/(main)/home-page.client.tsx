"use client";

import { HomeShell } from "@/components/home/home-shell";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { OptionDropdown } from "@/components/option-dropdown";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const Synthesis = dynamic(() => import("@/components/synthesis"), { ssr: false });
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
import { getVisibleModels, MODELS } from "@/lib/constants";
import type { FeaturedApp } from "@/lib/featured-apps";
import { BuilderToggles } from "@/components/builder-toggles";
import { PromptRewriteButton } from "@/components/prompt-rewrite-button";
import { PlanModePanel } from "@/components/plan-mode-panel";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

type Mode = "ask" | "plan" | "agent";
type ComposerAttachment = {
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
};

const HEADLINES = [
  "Build apps at hyperspeed",
  "Warp prompts into production",
  "Forge code at light velocity",
  "Neon synthesis of full-stack apps",
  "Synthesize vision at warp speed",
];

const PROMPT_CHIP_GROUPS = [
  {
    title: "SaaS landing",
    prompts: [
      "Build a premium SaaS landing page for a future-ready B2B product with a cinematic hero, GSAP-style scroll reveals, shadcn/ui pricing, animated feature cards, testimonials, waitlist capture, and a fully responsive dark visual system.",
      "Create a conversion-focused SaaS landing page for a productivity platform using Three.js-inspired background depth, magnetic hover cards, sticky nav, pricing tiers, FAQ accordion, lead form, and polished mobile-first layout.",
      "Generate a launch-ready SaaS homepage for an existing company product with carousel-style feature storytelling, glass panels, shadcn/ui components, animated stats placeholders, customer logo placeholders, and backend-ready signup form wiring.",
    ],
  },
  {
    title: "GSAP / Three.js",
    prompts: [
      "Create a highly interactive landing page with GSAP-style section transitions, Three.js-inspired particle background, hover-reactive cards, scroll progress, responsive animation fallbacks, and a clean shadcn/ui component system.",
      "Build a futuristic product microsite with 3D orbital visuals, animated carousel panels, pointer-reactive gradients, kinetic typography, sticky feature navigation, and performant responsive behavior across mobile, tablet, and desktop.",
      "Generate an immersive launch page with ReactBits-style free background effects, reveal-on-scroll modules, animated comparison cards, a pricing carousel, and production-safe animation fallbacks when motion is reduced.",
    ],
  },
  {
    title: "SMM marketing",
    prompts: [
      "Build a social media marketing agency site with campaign packages, content calendar preview, creator workflow cards, lead-generation form, animated case-study carousel, shadcn/ui dialogs, and responsive dark editorial styling.",
      "Create an SMM dashboard landing page for brands with post scheduling, analytics previews, team approval flows, inbox automation, pricing, testimonials, and backend-ready contact capture.",
      "Generate a marketing campaign builder app with brand kit setup, AI caption generator UI, asset upload modal, campaign calendar, approval statuses, analytics cards, and admin-ready full-stack structure.",
    ],
  },
  {
    title: "Home automation",
    prompts: [
      "Build a full-stack smart home automation dashboard with room controls, device cards, scene builder, energy usage charts, user auth screens, admin settings, and responsive touch-friendly controls.",
      "Create an IoT home control app with lighting, thermostat, security cameras, schedules, automations, live status indicators, protected routes, and a polished shadcn/ui dashboard layout.",
      "Generate a home automation SaaS portal for installers with customer sites, device provisioning, alerts, service tickets, billing status, team roles, and a super-admin overview.",
    ],
  },
  {
    title: "Electric cars",
    prompts: [
      "Build an electric vehicle brand landing page with a cinematic hero, range and charging feature sections, model comparison carousel, reservation form, dealer locator UI, and responsive Three.js-inspired visuals.",
      "Create an EV ownership dashboard with vehicle status, charging history, trip analytics, service reminders, subscription billing, authentication, and admin tools for fleet managers.",
      "Generate an electric car e-commerce configurator with model selection, color and wheel options, financing calculator, checkout flow, inventory dashboard, and mobile-first interaction design.",
    ],
  },
  {
    title: "E-commerce",
    prompts: [
      "Build a full-stack online shopping app with product grid, filters, product detail pages, cart, checkout flow, order history, user authentication, admin inventory dashboard, and shadcn/ui components.",
      "Create a premium marketplace dashboard with seller onboarding, product upload modal, order management, analytics cards, customer messaging, refunds, and super-admin moderation tools.",
      "Generate a modern e-commerce storefront with animated product carousel, wishlist, search, variant picker, responsive checkout, promotional landing sections, and backend-ready Prisma data models.",
    ],
  },
  {
    title: "Full-stack apps",
    prompts: [
      "Build a production-style full-stack application with authentication, Prisma schema, protected routes, CRUD workflows, file upload modal, activity feed, admin dashboard, and polished loading and empty states.",
      "Create a collaborative workspace app with projects, tasks, comments, members, role permissions, search, notifications, settings pages, and responsive dashboard navigation.",
      "Generate a multi-tenant SaaS app with workspace switching, billing placeholders, team invitations, audit logs, admin and super-admin dashboards, and clean shadcn/ui data tables.",
    ],
  },
  {
    title: "Dashboards",
    prompts: [
      "Build a responsive analytics dashboard with KPI cards, charts, date range filters, data table, command palette, export buttons, settings drawer, and polished loading skeletons.",
      "Create an operations dashboard with live status panels, incident timeline, team workload, searchable resources, alerts, sidebar navigation, and admin controls.",
      "Generate a finance dashboard with revenue charts, expense categories, transaction table, account cards, budget goals, export modal, and responsive mobile summary cards.",
    ],
  },
  {
    title: "Auth screens",
    prompts: [
      "Build a complete authentication flow with sign in, sign up, forgot password, reset password, 2FA verification, profile setup, protected dashboard, validation states, and responsive shadcn/ui forms.",
      "Create premium onboarding and authentication screens for a SaaS app with role selection, workspace creation, invite acceptance, email verification UI, and animated success states.",
      "Generate an enterprise auth portal with SSO buttons, passwordless login, admin approval state, audit-friendly session list, account security settings, and mobile-safe layouts.",
    ],
  },
  {
    title: "Admin panels",
    prompts: [
      "Build an admin dashboard with users, roles, permissions, audit logs, system health, content moderation, settings, search, filters, bulk actions, and two-way links back to the app.",
      "Create a super-admin console for a multi-tenant SaaS with tenant management, impersonation UI, billing status, feature flags, usage analytics, incident controls, and responsive data tables.",
      "Generate a back-office CRM admin panel with contacts, deals, pipelines, tasks, team permissions, reports, import modal, and polished empty/error/loading states.",
    ],
  },
  {
    title: "AI apps",
    prompts: [
      "Build an AI application with prompt input, model selector, file attachment modal, generation history, result cards, saved outputs, settings, billing placeholders, and a full-stack backend-ready architecture.",
      "Create an AI content studio with document upload, prompt templates, brand voice settings, generation queue, preview editor, export actions, admin dashboard, and responsive controls.",
      "Generate an AI research assistant app with source upload, chat panel, citation cards, saved threads, project folders, search, user auth, and polished shadcn/ui layout.",
    ],
  },
  {
    title: "AI chat UI",
    prompts: [
      "Build an AI agent chat dashboard inspired by Claude, Perplexity, OpenAI, and Mistral patterns with a hero prompt input, attachment controls, model selection, tools menu, chat history, and responsive split-pane workspace.",
      "Create a full-stack AI agent workspace with prompt composer, file attachments, tool calling activity panel, sources sidebar, conversation folders, settings, admin controls, and polished streaming states.",
      "Generate an AI assistant landing-to-app flow with public hero prompt box, advanced controls, dashboard chat threads, agent presets, knowledge upload modal, and production-style auth screens.",
    ],
  },
];

const PRESET_PROMPTS = new Set(
  PROMPT_CHIP_GROUPS.flatMap((group) => group.prompts),
);

function PresetChipsScroller({
  groups,
  activeTitles,
  onSelect,
}: {
  groups: typeof PROMPT_CHIP_GROUPS;
  activeTitles: Record<string, number>;
  onSelect: (group: (typeof PROMPT_CHIP_GROUPS)[number]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, groups.length]);

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 168, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto w-full max-w-[34.5rem]">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll presets left"
          className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/80 text-muted-foreground/50 shadow-sm backdrop-blur-sm transition hover:text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-7 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maxWidth: "100%" }}
      >
        {groups.map((group) => {
          const isActive = typeof activeTitles[group.title] === "number";
          return (
            <button
              key={group.title}
              type="button"
              onClick={() => onSelect(group)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? "border-foreground/25 bg-accent text-foreground"
                  : "border-border/60 bg-background/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              {group.title}
            </button>
          );
        })}
      </div>
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll presets right"
          className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/80 text-muted-foreground/50 shadow-sm backdrop-blur-sm transition hover:text-muted-foreground"
        >
          <ChevronRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const context = use(Context);
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("prompt");
    if (t) setPrompt(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [prompt, setPrompt] = useState("");
  const visibleModels = getVisibleModels();
  const [model, setModel] = useState(
    visibleModels.find((m) => !m.hidden)?.value || visibleModels[0]?.value || MODELS[0].value,
  );
  const [featuredApps, setFeaturedApps] = useState<FeaturedApp[] | null>(null);
  const [shadcnEnabled, setShadcnEnabled] = useState(true);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("agent");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<
    boolean | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [promptChipIndexes, setPromptChipIndexes] = useState<Record<string, number>>({});

  const [, startTransition] = useTransition();

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
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/featured", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setFeaturedApps(data.apps ?? []);
        }
      } catch {
        if (!cancelled) setFeaturedApps([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 4800);
    return () => clearInterval(interval);
  }, []);

  const isUploadAvailable = blobUploadConfigured === true;

  const showEnhance = useMemo(
    () => prompt.trim().length > 0 && !PRESET_PROMPTS.has(prompt),
    [prompt],
  );

  const getModelLabel = (val: string) => MODELS.find(x => x.value === val)?.label || val;

  const modes = [
    { value: "ask" as const, label: "Ask", icon: "?" },
    { value: "plan" as const, label: "Plan", icon: "≡" },
    { value: "agent" as const, label: "Agent  ", icon: "◇" },
  ];
  const currentMode = modes.find(m => m.value === mode)!;

  const handlePromptChipClick = (group: (typeof PROMPT_CHIP_GROUPS)[number]) => {
    const currentIndex = promptChipIndexes[group.title] ?? -1;
    const nextIndex = (currentIndex + 1) % group.prompts.length;
    setPromptChipIndexes((current) => ({ ...current, [group.title]: nextIndex }));
    setPrompt(group.prompts[nextIndex]);
  };

  const uploadAttachment = async (file: File) => {
    if (!isUploadAvailable) {
      toast({ title: "Upload unavailable", description: "Blob storage is not configured.", variant: "destructive" });
      return undefined;
    }
    setScreenshotLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/blob-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return {
        url: data.url as string,
        kind: file.type.startsWith("image/") ? ("image" as const) : ("file" as const),
        filename: file.name || "attachment",
        size: file.size,
      };
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      return undefined;
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handlePromptSend = async (content: string, files?: File[]) => {
    if (!content.trim() && !files?.length) return;
    setIsSubmitting(true);
    startTransition(async () => {
      try {
        let nextScreenshotUrl = screenshotUrl;
        const attachments: ComposerAttachment[] = [];

        if (files?.[0]) {
          const uploaded = await uploadAttachment(files[0]);
          if (!uploaded) {
            setIsSubmitting(false);
            return;
          }
          nextScreenshotUrl = uploaded.url;
          attachments.push({
            kind: uploaded.kind,
            filename: uploaded.filename,
            url: uploaded.url,
            size: uploaded.size,
          });
        }

        const promptText =
          content.trim() || (files?.length ? "Build this from the attached file" : "");

        const res = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            model,
            mode,
            screenshotUrl: nextScreenshotUrl,
            attachments,
            shadcn: shadcnEnabled,
          }),
        });
        if (!res.ok) {
          let description = "Failed to create chat";
          try {
            const data = await res.json();
            if (data?.error) description = data.error;
          } catch {}
          toast({ title: "Error", description, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        const { chatId, lastMessageId } = await res.json();

        const streamPromise = fetch("/api/get-next-completion-stream-promise", {
          method: "POST",
          body: JSON.stringify({ messageId: lastMessageId, model, reasoning: reasoningEnabled }),
        }).then(async (r) => {
          if (!r.ok) throw new Error((await r.text()) || "Failed to start generation");
          if (!r.body) throw new Error("No body on response");
          return r.body;
        });

        context.setStreamPromise(streamPromise);
        setPrompt("");
        setScreenshotUrl(undefined);
        router.push(`/chats/${chatId}`);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <section
          id="hero"
          className="relative flex min-h-dvh flex-col overflow-hidden"
        >
          <Synthesis
            speed={0.1}
            color1="#3023e7"
            color2="#e265c7"
            color3="#f0ebe5"
            scale={0.7}
            complexity={11}
            distortion={0.5}
            glowIntensity={0.5}
            flowFrequency={4.5}
            contrast={1.2}
            backgroundColor="#1a1040"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/25 via-black/10 to-black/35"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-1 flex-col">
            <Header hideLogo showSidebarTrigger />

            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-6">
              <div className="flex w-full max-w-[760px] flex-col items-center">
              <h1
                id="hero-headline"
                className="min-h-[4.25rem] text-balance text-center text-4xl font-semibold tracking-tight text-white/90 drop-shadow-lg md:min-h-[5.25rem] md:text-6xl"
              >
                {HEADLINES[headlineIndex]}
              </h1>

              <div
                id="prompt-composer"
                className="relative mt-8 w-full"
                style={{ ["--an-max-width" as any]: "760px" }}
              >
                {mode === "plan" ? <PlanModePanel className="mb-3" /> : null}
                <PromptInputBox
                  value={prompt}
                  onValueChange={setPrompt}
                  onSend={handlePromptSend}
                  isLoading={isSubmitting}
                  disabled={isSubmitting || screenshotLoading}
                  placeholder="Describe what to build"
                  thinkEnabled={reasoningEnabled}
                  onThinkChange={setReasoningEnabled}
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
                  toolbarEnd={
                    showEnhance ? (
                      <PromptRewriteButton
                        prompt={prompt}
                        mode={mode}
                        model={model}
                        onRewrite={setPrompt}
                        disabled={isSubmitting || screenshotLoading}
                        iconOnly
                      />
                    ) : null
                  }
                />

                <div className="mt-4">
                  <PresetChipsScroller
                    groups={PROMPT_CHIP_GROUPS}
                    activeTitles={promptChipIndexes}
                    onSelect={handlePromptChipClick}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <OptionDropdown
                    value={mode}
                    onValueChange={(value) => setMode(value as Mode)}
                    aria-label="Select mode"
                    triggerLabel={
                      <span>
                        {currentMode.icon} {currentMode.label}
                      </span>
                    }
                    triggerClassName="h-8 px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    options={modes.map((item) => ({
                      value: item.value,
                      label: (
                        <span>
                          {item.icon} {item.label}
                        </span>
                      ),
                    }))}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <BuilderToggles
                      compact
                      shadcnEnabled={shadcnEnabled}
                      onShadcnChange={setShadcnEnabled}
                      reasoningEnabled={reasoningEnabled}
                      onReasoningChange={setReasoningEnabled}
                    />
                    <OptionDropdown
                      value={model}
                      onValueChange={setModel}
                      aria-label="Select AI model"
                      triggerLabel={getModelLabel(model)}
                      triggerClassName="h-8 min-w-[180px] px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      contentClassName="max-h-[320px]"
                      options={getVisibleModels().map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                    />
                  </div>
                </div>

                {mode === "ask" ? (
                  <p className="mt-2 text-center text-xs text-white/70">
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
          className="mx-auto w-full max-w-5xl border-t border-border/50 px-4 py-14"
        >
          <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Featured templates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a sandbox preview, then remix in the builder.
              </p>
            </div>
            <Link href="/gallery" className="text-xs text-muted-foreground transition hover:text-foreground">
              View gallery
            </Link>
          </div>
          <div className="mt-4">
            <FeaturedAppsGrid
              apps={featuredApps ?? undefined}
              limit={3}
              compact
              liveThumbs={false}
            />
          </div>
        </section>

        <footer
          id="examples"
          className="flex w-full justify-center border-t border-border/40 px-4 py-8 text-xs text-muted-foreground"
        >
          Chinna-Coder — Build production apps from a prompt
        </footer>
      </div>
    </HomeShell>
  );
}
