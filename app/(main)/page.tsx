"use client";

import Hyperspeed from "@/components/Hyperspeed";
import { hyperspeedPresets } from "@/components/HyperSpeedPresets";
import LiquidEther from "@/components/LiquidEther";
import { HomeShell } from "@/components/home/home-shell";
import BlurText from "@/components/BlurText";
import { InputBar, type AttachedFile, type AttachedImage } from "@/components/agent-elements/input-bar";
import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";
import { OptionDropdown } from "@/components/option-dropdown";
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
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
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

const PROMPT_GROUP_BY_TITLE = new Map(
  PROMPT_CHIP_GROUPS.map((group) => [group.title, group] as const),
);

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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const homeInfoBar =
    mode === "plan"
      ? {
          title: "Plan mode",
          description: "Use the helper question to capture scope before generation.",
          position: "bottom" as const,
        }
      : mode === "ask"
        ? {
            title: "Ask mode",
            description: "Best for questions, refinements, and targeted changes.",
            position: "bottom" as const,
          }
        : undefined;

  const homeQuestionBar =
    mode === "plan"
      ? {
          id: "home-plan-helper",
          questions: [
            {
              kind: "text" as const,
              title: "Plan the build",
              description: "Add one extra constraint or must-have before sending.",
              placeholder: "e.g. include auth, billing, and an admin dashboard",
            },
          ],
          submitLabel: "Add to prompt",
          allowSkip: true,
          onSubmit: (answer: QuestionAnswer) => {
            if (answer.kind !== "text") return;
            const planText = answer.text?.trim();
            if (!planText) return;
            setPrompt((current) => {
              const next = current.trim();
              return next
                ? `${next}\n\nPlan note: ${planText}`
                : planText;
            });
          },
        }
      : undefined;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isUploadAvailable) return;
    setScreenshotLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/blob-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (file.type.startsWith("image/")) {
        const nextImage: AttachedImage = {
          id: crypto.randomUUID(),
          filename: file.name || "attachment.png",
          url: data.url,
          size: file.size,
        };
        setAttachedImages([nextImage]);
        setAttachedFiles([]);
        setScreenshotUrl(data.url);
      } else {
        const nextFile: AttachedFile = {
          id: crypto.randomUUID(),
          filename: file.name || "attachment",
          size: file.size,
        };
        setAttachedFiles([nextFile]);
        setAttachedImages([]);
        setScreenshotUrl(data.url);
      }
      if (!prompt.trim()) setPrompt("Build this from the attached file");
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setScreenshotLoading(false); }
  };

  const handleImagePaste = async (event: React.ClipboardEvent) => {
    if (!isUploadAvailable) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      await handleFileUpload({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      break;
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleSend = async ({ content }: { role: "user"; content: string }) => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const attachments: ComposerAttachment[] = [
          ...attachedImages.map((image) => ({
            kind: "image" as const,
            filename: image.filename,
            url: image.url,
            size: image.size,
          })),
          ...attachedFiles.map((file) => ({
            kind: "file" as const,
            filename: file.filename,
            url: screenshotUrl,
            size: file.size,
          })),
        ];
        const res = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: content,
            model,
            mode,
            screenshotUrl,
            attachments,
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
          body: JSON.stringify({ messageId: lastMessageId, model }),
        }).then(async (r) => {
          if (!r.ok) throw new Error((await r.text()) || "Failed to start generation");
          if (!r.body) throw new Error("No body on response");
          return r.body;
        });

        context.setStreamPromise(streamPromise);
        setPrompt("");
        setAttachedImages([]);
        setAttachedFiles([]);
        setScreenshotUrl(undefined);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.push(`/chats/${chatId}`);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <HomeShell>
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

      <div className="relative z-10 isolate flex h-full grow flex-col">
        <Header hideLogo showSidebarTrigger />

        <div className="mt-8 flex grow flex-col items-center px-4 lg:mt-14">
          <h1
            id="hero-headline"
            className="text-balance text-center text-4xl font-semibold tracking-tight md:text-6xl min-h-[4.25rem] md:min-h-[5.25rem]"
          >
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

          <div
            id="prompt-composer"
            className="relative mt-7 w-full max-w-[760px]"
            style={{ ["--an-max-width" as any]: "760px" }}
          >
            <InputBar
              value={prompt}
              onChange={setPrompt}
              onSend={handleSend}
              onStop={() => {}}
              status={isSubmitting ? "submitted" : "ready"}
              placeholder="Describe what to build"
              autoFocus
              disabled={isSubmitting || screenshotLoading}
              onAttach={handleAttachClick}
              onPaste={handleImagePaste}
              attachedImages={attachedImages}
              attachedFiles={attachedFiles}
              onRemoveImage={() => {
                setAttachedImages([]);
                setScreenshotUrl(undefined);
              }}
              onRemoveFile={() => {
                setAttachedFiles([]);
                setScreenshotUrl(undefined);
              }}
              infoBar={homeInfoBar}
              questionBar={homeQuestionBar}
              suggestions={{
                className: "max-md:-mx-3 max-md:px-3",
                items: PROMPT_CHIP_GROUPS.map((group) => ({
                  id: group.title,
                  label: group.title,
                  className:
                    typeof promptChipIndexes[group.title] === "number"
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                      : undefined,
                })),
              }}
              onSuggestionSelect={(item) => {
                const group = PROMPT_GROUP_BY_TITLE.get(item.id);
                if (group) handlePromptChipClick(group);
              }}
              leftActions={
                <OptionDropdown
                  value={mode}
                  onValueChange={(value) => setMode(value as Mode)}
                  aria-label="Select mode"
                  triggerLabel={
                    <span>
                      {currentMode.icon} {currentMode.label}
                    </span>
                  }
                  triggerClassName="h-8 px-2.5 text-muted-foreground hover:bg-zinc-800 hover:text-foreground"
                  options={modes.map((item) => ({
                    value: item.value,
                    label: (
                      <span>
                        {item.icon} {item.label}
                      </span>
                    ),
                  }))}
                />
              }
              rightActions={
                <OptionDropdown
                  value={model}
                  onValueChange={setModel}
                  aria-label="Select AI model"
                  triggerLabel={getModelLabel(model)}
                  triggerClassName="h-8 min-w-[180px] px-2.5 text-muted-foreground hover:bg-zinc-800 hover:text-foreground"
                  contentClassName="max-h-[320px]"
                  options={MODELS.filter((item) => !item.hidden).map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
              }
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
              className="hidden"
              onChange={handleFileUpload}
              disabled={!isUploadAvailable || isSubmitting || screenshotLoading}
            />
          </div>
        </div>

        <section id="featured-templates" className="mt-14 w-full max-w-5xl px-4">
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
            <FeaturedAppsGrid limit={3} compact />
          </div>
        </section>

        <footer id="examples" className="mt-auto flex w-full justify-center pb-6 pt-10 text-xs text-muted-foreground">
          Chinna-Coder — Build production apps from a prompt
        </footer>
      </div>
    </div>
    </HomeShell>
  );
}

export const runtime = "edge";
export const maxDuration = 60;
