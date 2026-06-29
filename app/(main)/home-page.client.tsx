"use client";

import { HomeShell } from "@/components/home/home-shell";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import Link from "next/link";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { toast } from "@/hooks/use-toast";

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

export default function HomePageClient() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [promptChipIndexes, setPromptChipIndexes] = useState<Record<string, number>>({});

  const handlePromptChipClick = (group: (typeof PROMPT_CHIP_GROUPS)[number]) => {
    const currentIndex = promptChipIndexes[group.title] ?? -1;
    const nextIndex = (currentIndex + 1) % group.prompts.length;
    setPromptChipIndexes((prev) => ({ ...prev, [group.title]: nextIndex }));
    setPrompt(group.prompts[nextIndex]);
  };

  const handlePromptSend = () => {
    const clean = prompt.trim();
    if (!clean) return;

    setIsSubmitting(true);

    fetch("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: clean,
        model: "claude-3-5-sonnet",
        quality: "high",
        mode: "agent",
        shadcn: true,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          router.push(`/chats/${data.id}?preview=1`);
        } else {
          toast({ title: "Failed to start build" });
        }
      })
      .catch(() => toast({ title: "Error", description: "Could not create chat" }))
      .finally(() => setIsSubmitting(false));
  };

  const handleAttachmentUpload = async (file: File) => {
    // simple stub - in real it would upload
    const url = URL.createObjectURL(file);
    setScreenshotUrl(url);
    setPrompt((p) => p || "Build from the attached file.");
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

                  <div id="prompt-composer" className="relative w-full max-w-[620px]">
                    {/* Dark grey prompt input with soft curved corners */}
                    <div className="flex items-center gap-3 rounded-3xl bg-[#1f1f22] border border-white/10 pl-5 pr-2 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                      <button 
                        onClick={() => { /* attach logic if needed */ }}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-lg leading-none hover:bg-white/15 transition"
                      >
                        +
                      </button>

                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePromptSend();
                          }
                        }}
                        placeholder="Ask Llamacoder to create a dashboard"
                        className="flex-1 bg-transparent outline-none placeholder:text-white/50 text-white"
                      />

                      <div className="flex items-center gap-1 text-white/60">
                        <div className="flex cursor-pointer items-center rounded-full bg-white/5 px-3 py-1 text-xs hover:bg-white/10">
                          Build <span className="ml-0.5 text-[9px]">⌄</span>
                        </div>
                        <button
                          onClick={handlePromptSend}
                          disabled={isSubmitting || !prompt.trim()}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black disabled:opacity-50 transition active:scale-[0.96]"
                        >
                          <ArrowUp size={15} />
                        </button>
                      </div>
                    </div>

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
