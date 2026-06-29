"use client";

import { HomeShell } from "@/components/home/home-shell";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const HERO_GRADIENT =
  "linear-gradient(180deg, #0a0c1f 0%, #0e1f5a 20%, #2a237a 38%, #4f2a8f 52%, #7c2a7a 68%, #c23a6a 82%, #f05a7a 92%, #ff7a5a 100%)";

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

  return (
    <HomeShell>
      <div className="flex min-h-dvh bg-[#0a0a0a] text-white">
        {/* Sidebar styled exactly like the reference */}
        <div className="hidden w-64 flex-shrink-0 flex-col border-r border-white/10 bg-[#0a0a0a] text-sm lg:flex">
          <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-3.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#ff4d8d] text-[11px] font-bold">P</div>
            <span className="font-medium">pichi's Llamacoder</span>
            <span className="ml-0.5 text-white/50">⌄</span>
          </div>

          <div className="flex-1 overflow-auto px-2 py-3 space-y-px text-[13px]">
            <div className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 font-medium">📊 Dashboard</div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-white/70 hover:bg-white/5 rounded cursor-pointer">🔍 Search <span className="ml-auto text-[10px] opacity-50">⌘K</span></div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-white/70 hover:bg-white/5 rounded cursor-pointer">📚 Resources</div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-white/70 hover:bg-white/5 rounded cursor-pointer">🔌 Connectors</div>

            <div className="pt-3 pb-1 px-3 text-[10px] tracking-[1px] text-white/40">PROJECTS</div>
            <div className="pl-1 space-y-px">
              <div className="px-3 py-1 text-white/70 hover:bg-white/5 rounded cursor-pointer">All projects</div>
              <div className="px-3 py-1 text-white/70 hover:bg-white/5 rounded cursor-pointer">Starred</div>
              <div className="px-3 py-1 text-white/70 hover:bg-white/5 rounded cursor-pointer">Created by me</div>
              <div className="px-3 py-1 text-white/70 hover:bg-white/5 rounded cursor-pointer">Shared with me</div>
            </div>

            <div className="pt-3 pb-1 px-3 text-[10px] tracking-[1px] text-white/40">RECENTS</div>
            <div className="pl-1 text-white/60 space-y-px">
              <div className="px-3 py-1 hover:bg-white/5 rounded cursor-pointer truncate">Dashboard builder</div>
              <div className="px-3 py-1 hover:bg-white/5 rounded cursor-pointer truncate">SaaS landing</div>
            </div>
          </div>
        </div>

        {/* Main area with subtle space + soft rounded gradient */}
        <div className="flex-1 p-3 md:p-4">
          <div
            className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[28px] p-8 md:p-12"
            style={{ background: HERO_GRADIENT }}
          >
            {/* soft overlays */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_45%_25%,rgba(255,255,255,0.06),transparent)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_80%,rgba(0,0,0,0.28),transparent)]" />

            {/* Toggle view icon */}
            <div className="absolute right-5 top-5 z-20">
              <button className="rounded-lg border border-white/15 bg-black/30 p-1.5 hover:bg-white/10 transition" title="Toggle view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>

            <div className="relative z-10 w-full max-w-[620px] px-6 text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-0.5 text-xs backdrop-blur">
                <span className="flex -space-x-0.5">
                  <span className="block h-2.5 w-2.5 rounded-full bg-blue-400 ring-1 ring-black/60" />
                  <span className="block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-1 ring-black/60" />
                  <span className="block h-2.5 w-2.5 rounded-full bg-violet-400 ring-1 ring-black/60" />
                </span>
                <span>Connect all your tools</span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tighter md:text-[42px] mb-8">
                Let's build something, pichi
              </h1>

              {/* Dark grey prompt input with soft curved corners */}
              <div className="mx-auto w-full">
                <div className="flex items-center gap-3 rounded-3xl bg-[#1f1f22] border border-white/10 pl-5 pr-2 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <button className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-lg leading-none hover:bg-white/15 transition">
                    +
                  </button>

                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePromptSend(); }}
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
              </div>

              {/* Preset quick prompts - kept as requested */}
              <PresetChipsScroller
                groups={PROMPT_CHIP_GROUPS}
                activeTitles={promptChipIndexes}
                onSelect={handlePromptChipClick}
              />
            </div>
          </div>
        </div>
      </div>
    </HomeShell>
  );
}
