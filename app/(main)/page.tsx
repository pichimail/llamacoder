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
import { useRouter, useSearchParams } from "next/navigation";
import {
  use,
  useState,
  useRef,
  useTransition,
  useEffect,
} from "react";
import { Context } from "./providers";
import { useTheme } from "@/components/theme-provider";

import Header from "@/components/header";
import { MODELS } from "@/lib/constants";
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
  { label: "Gallery", ariaLabel: "Browse the community gallery", link: "/gallery" },
];

const staggeredSocialItems = [
  {
    label: "GitHub",
    link: "https://github.com/pichimail/llamacoder",
  },
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

export default function Home() {
  const router = useRouter();
  const context = use(Context);
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("prompt");
    if (t) setPrompt(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [promptChipIndexes, setPromptChipIndexes] = useState<Record<string, number>>({});

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
    { value: "agent" as const, label: "Agent  ", icon: "◇" },
  ];
  const currentMode = modes.find(m => m.value === mode)!;

  const handlePromptChipClick = (group: (typeof PROMPT_CHIP_GROUPS)[number]) => {
    const currentIndex = promptChipIndexes[group.title] ?? -1;
    const nextIndex = (currentIndex + 1) % group.prompts.length;
    setPromptChipIndexes((current) => ({ ...current, [group.title]: nextIndex }));
    setPrompt(group.prompts[nextIndex]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

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
        className="[&_.sm-logo]:hidden [&_.sm-toggle-textWrap]:hidden [&_.staggered-menu-header]:top-8 [&_.staggered-menu-panel]:pt-24"
        position="left"
        isFixed={true}
        logoUrl="/chinna-coder-logo-dark.svg"
        items={staggeredMenuItems}
        socialItems={staggeredSocialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor={mounted && resolvedTheme === "dark" ? "#f8fafc" : "#0f172a"}
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={["#0f172a", "#111827", "#1f2937"]}
        accentColor="#60a5fa"
      />

      <div className="relative z-10 isolate flex h-full grow flex-col">
        <Header hideLogo />

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

          <form id="prompt-composer" className="relative mt-7 w-full max-w-[580px]" onSubmit={async (e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            startTransition(async () => {
              const res = await fetch("/api/create-chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model, mode, screenshotUrl }),
              });
              if (!res.ok) {
                let description = "Failed to create chat";
                try {
                  const data = await res.json();
                  if (data?.error) description = data.error;
                } catch {}
                toast({ title: "Error", description, variant: "destructive" });
                return;
              }
              const { chatId, lastMessageId } = await res.json();

              // CRITICAL: start the first generation immediately so the chat
              // page begins streaming the app instead of sitting empty.
              const streamPromise = fetch("/api/get-next-completion-stream-promise", {
                method: "POST",
                body: JSON.stringify({ messageId: lastMessageId, model }),
              }).then(async (r) => {
                if (!r.ok) throw new Error((await r.text()) || "Failed to start generation");
                if (!r.body) throw new Error("No body on response");
                return r.body;
              });
              context.setStreamPromise(streamPromise);
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

              <div id="examples" className="mt-3 scroll-mt-24">
                <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Dynamic build prompts</span>
                  <span className="hidden sm:inline">Click any chip again to rotate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {PROMPT_CHIP_GROUPS.map((group) => {
                  const activeIndex = promptChipIndexes[group.title];
                  const hasRotated = typeof activeIndex === "number";
                  return (
                  <button
                    key={group.title}
                    type="button"
                    onClick={() => handlePromptChipClick(group)}
                    aria-label={`Generate ${group.title} prompt variation`}
                    className={`group min-h-10 rounded-xl border px-3 py-2 text-left text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/70 hover:bg-zinc-900/85 hover:text-cyan-200 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${hasRotated ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100" : "border-border bg-muted/85 text-foreground"}`}
                  >
                    <span className="block truncate">{group.title}</span>
                    <span className="mt-1 block text-[9px] font-normal text-muted-foreground group-hover:text-cyan-100/70">
                      v{(activeIndex ?? -1) + 2 > group.prompts.length ? 1 : (activeIndex ?? -1) + 2}/{group.prompts.length}
                    </span>
                  </button>
                  );
                })}
                </div>
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
