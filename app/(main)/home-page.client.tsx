"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, Mic, Paperclip } from "lucide-react";

import { HomeShell } from "@/components/home/home-shell";
import { TextColor } from "@/components/ui/text-color";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
import type { FeaturedApp } from "@/lib/featured-apps";
import { toast } from "@/hooks/use-toast";

type Mode = "ask" | "plan" | "agent";

const HERO_GRADIENT =
  "radial-gradient(125% 125% at 50% 101%, rgba(245,87,2,1) 10.5%, rgba(245,120,2,1) 16%, rgba(245,140,2,1) 17.5%, rgba(245,170,100,1) 25%, rgba(238,174,202,1) 40%, rgba(202,179,214,1) 65%, rgba(148,201,233,1) 100%)";

const PRESET_CHIPS = [
  "SaaS landing",
  "GSAP / Three.js",
  "SMM marketing",
  "Home automation",
  "Electric cars",
  "E-commerce",
  "Full-stack SaaS",
];

const PRESET_PROMPTS: Record<string, string> = {
  "SaaS landing": "Build a premium SaaS landing page with cinematic hero, pricing, testimonials, FAQ, waitlist capture, and mobile-first responsive layout.",
  "GSAP / Three.js": "Build an immersive Three.js product showcase with GSAP-style scroll animation, responsive fallback states, and premium visual hierarchy.",
  "SMM marketing": "Build a social media campaign planner with calendar, post queue, campaign approvals, channel filters, and content performance cards.",
  "Home automation": "Build a smart home control app with rooms, device toggles, scenes, security, energy usage, and mobile-first controls.",
  "Electric cars": "Build an EV companion app with vehicle status, range planner, charging map, trip history, climate controls, and battery health.",
  "E-commerce": "Build a premium mobile-first e-commerce app with product browsing, filters, cart, checkout, wishlist, order tracking, and admin inventory.",
  "Full-stack SaaS": "Build a production-ready SaaS dashboard with auth screens, project CRUD, team roles, billing plans, API keys, audit logs, and responsive shadcn UI.",
};

export function HomePageClient({ featuredApps }: { featuredApps: FeaturedApp[] }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("agent");
  const [model, setModel] = useState(MODELS.find((item) => !item.hidden)?.value || "zai-org/GLM-5");
  const [isSubmitting, startTransition] = useTransition();
  const visibleModels = MODELS.filter((item) => !item.hidden);

  function submitPrompt() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    startTransition(async () => {
      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          model,
          quality: "high",
          mode,
          shadcn: true,
          reasoning: false,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.id) {
        toast({
          title: "Could not start build",
          description: data?.error || "Please check auth/API configuration.",
          variant: "destructive",
        });
        return;
      }
      router.push(`/chats/${data.id}?preview=1`);
    });
  }

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col text-foreground">
        <section id="hero" className="relative flex min-h-dvh overflow-hidden" style={{ background: HERO_GRADIENT }}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,122,0,0.34),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_34%)]" />
          <div className="relative flex min-h-dvh w-full flex-col">
            <Header hideLogo />
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-0 md:pb-32">
              <div className="flex w-full max-w-[760px] -translate-y-4 flex-col items-center md:-translate-y-8">
                <TextColor className="mb-4 min-h-[4.25rem] md:min-h-[5.25rem]" />

                <div id="prompt-composer" className="w-full">
                  <div className="rounded-[28px] border border-white/10 bg-[#1F2023]/96 p-2.5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submitPrompt();
                        }
                      }}
                      placeholder="Describe what to build"
                      aria-label="Describe what to build"
                      disabled={isSubmitting}
                      rows={3}
                      className="min-h-[76px] w-full resize-none rounded-[20px] bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-400 disabled:opacity-60"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <button type="button" className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Attach file">
                          <Paperclip className="size-3.5" aria-hidden="true" />
                        </button>
                        <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="h-8 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs text-zinc-200 outline-none">
                          <option value="agent">Agent</option>
                          <option value="ask">Ask</option>
                          <option value="plan">Plan</option>
                        </select>
                        <select value={model} onChange={(event) => setModel(event.target.value)} className="h-8 max-w-[150px] rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs text-zinc-200 outline-none">
                          {visibleModels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Voice input">
                          <Mic className="size-3.5" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={submitPrompt} disabled={isSubmitting || !prompt.trim()} className="inline-flex size-8 items-center justify-center rounded-full bg-white text-[#1F2023] shadow-sm transition hover:-translate-y-px hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500" aria-label="Send prompt">
                          <ArrowUp className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto mt-3 w-full max-w-[760px] overflow-hidden px-0.5">
                    <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {PRESET_CHIPS.map((chip) => (
                        <button key={chip} type="button" onClick={() => setPrompt(PRESET_PROMPTS[chip])} className="shrink-0 snap-start whitespace-nowrap rounded-full border border-white/40 bg-white/45 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/70 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/80">
                          {chip}
                        </button>
                      ))}
                    </div>
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
            <div className="mt-4"><FeaturedAppsGrid apps={featuredApps} limit={6} compact /></div>
          </div>
        </section>
      </div>
    </HomeShell>
  );
}
