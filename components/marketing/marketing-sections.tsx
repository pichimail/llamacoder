"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  GitBranch,
  Globe,
  Layers,
  Lock,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { ScrambleText } from "@/components/marketing/scramble-text";
import { RichFooter } from "@/components/rich-footer";

const SHOWCASE = [
  { name: "Sneaker Store", meta: "42 files • 1.2s", tag: "E-commerce" },
  { name: "Team Dashboard", meta: "58 files • 1.6s", tag: "SaaS" },
  { name: "Booking Platform", meta: "39 files • 1.1s", tag: "Scheduling" },
  { name: "Analytics Hub", meta: "63 files • 1.8s", tag: "Data" },
  { name: "Creator CRM", meta: "47 files • 1.3s", tag: "CRM" },
  { name: "AI Chat UI", meta: "51 files • 1.5s", tag: "AI" },
];

const STEPS = [
  {
    num: "01",
    title: "Describe your app",
    desc: "Type one prompt. Be precise or loose — the planner fills the gaps and asks nothing you did not ask for.",
    icon: Terminal,
  },
  {
    num: "02",
    title: "Agents build everything",
    desc: "A multi-agent pipeline plans, writes, and validates the frontend, backend, database, and auth in parallel.",
    icon: Boxes,
  },
  {
    num: "03",
    title: "Preview & ship",
    desc: "A live hot-reloading preview appears instantly. Export to GitHub, download a ZIP, or deploy in a click.",
    icon: Rocket,
  },
];

const FEATURES = [
  { title: "Full-stack, not just UI", desc: "Frontend, backend routes, database schema, and auth — generated together and wired up.", icon: Layers },
  { title: "Live sandbox preview", desc: "Every build runs in an isolated sandbox with real hot reload — no waiting, no local setup.", icon: Zap },
  { title: "Design system control", desc: "Pick a design mode and the generator obeys it exactly, on every screen and state.", icon: Palette },
  { title: "External tools via MCP", desc: "Attach MCP servers so generated apps can call real tools and data sources.", icon: Globe },
  { title: "Export anywhere", desc: "Push straight to GitHub, download a ZIP, or deploy — your code, your infrastructure.", icon: GitBranch },
  { title: "Secure by default", desc: "Isolated execution, EU infrastructure, and full control over your data and keys.", icon: ShieldCheck },
];

const STATS = [
  { value: "1.4s", label: "Median time to first preview" },
  { value: "50+", label: "Files in a typical build" },
  { value: "6", label: "Locked design modes" },
  { value: "100%", label: "Ownership of your code" },
];

const FAQS = [
  { q: "Do I own the code?", a: "Completely. Export to GitHub or download a ZIP at any time — there is no lock-in." },
  { q: "Can it build a real backend?", a: "Yes. Database schemas, server routes, and authentication are generated and wired together, not stubbed." },
  { q: "Will it respect my chosen design?", a: "The selected design mode is treated as a strict contract and applied across every screen and state." },
  { q: "Is my data isolated?", a: "Each build runs in an isolated sandbox on EU infrastructure, and you keep control of your keys and data." },
];

export function MarketingSections() {
  return (
    <div className="relative bg-[#04070a] text-white">
      {/* 01 — Showcase */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24">
        <Reveal className="mb-10">
          <div className="text-xs uppercase tracking-[3px] text-emerald-400/80">Showcase</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            <ScrambleText text="Built with Chinna-Coder" scrambleOnView />
          </h2>
          <p className="mt-2 max-w-xl text-white/55">Real apps, one prompt each. Every preview below runs live.</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE.map((app, i) => (
            <Reveal key={app.name} delay={i * 0.05}>
              <div className="border-glow group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-emerald-400/30">
                <div className="flex items-center justify-between rounded-xl bg-black/50 px-4 py-3 text-xs text-white/45">
                  <span>app.chinna-coder.dev</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60">{app.tag}</span>
                </div>
                <div className="flex items-center justify-between px-2 pb-1 pt-3">
                  <span className="font-medium text-white">{app.name}</span>
                </div>
                <div className="px-2 pb-2 text-[11px] text-emerald-400">Live preview • {app.meta}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 02 — How it works */}
      <section className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-24">
        <Reveal className="mb-12">
          <div className="text-xs uppercase tracking-[3px] text-emerald-400/80">How it works</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            <ScrambleText text="From prompt to production" scrambleOnView />
          </h2>
        </Reveal>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i * 0.08}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30">
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-5xl text-white/10">{s.num}</span>
                  <span className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    <s.icon className="size-5" />
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-6 text-white/60">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 03 — Features grid */}
      <section className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-24">
        <Reveal className="mb-12 max-w-2xl">
          <div className="text-xs uppercase tracking-[3px] text-emerald-400/80">Capabilities</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            <ScrambleText text="Everything you need to ship" scrambleOnView />
          </h2>
          <p className="mt-3 text-white/55">A complete build pipeline, not a component generator. Each capability is production-grade.</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="border-glow group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm leading-6 text-white/60">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1} className="mt-8">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300">
            Explore all features <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      {/* 04 — Stats band */}
      <section className="border-y border-white/10 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-16 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06} className="text-center">
              <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-4xl font-semibold text-transparent sm:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-xs leading-5 text-white/55">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 05 — Security */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="text-xs uppercase tracking-[3px] text-emerald-400/80">Security</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              <ScrambleText text="Built for security-first teams" scrambleOnView />
            </h2>
            <p className="mt-4 max-w-md leading-7 text-white/60">
              Every build runs in an isolated sandbox on EU infrastructure. You keep full control of your data,
              your keys, and your generated code — nothing is shared, nothing is locked in.
            </p>
            <Link href="/privacy" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300">
              Read our security &amp; privacy <ArrowRight className="size-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Lock, label: "Isolated execution" },
                { icon: ShieldCheck, label: "EU infrastructure" },
                { icon: Sparkles, label: "Your keys, BYOK" },
                { icon: GitBranch, label: "Full code export" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <item.icon className="mb-3 size-5 text-emerald-300" />
                  <div className="text-sm font-medium text-white/85">{item.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 06 — FAQ + CTA */}
      <section className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div className="text-xs uppercase tracking-[3px] text-emerald-400/80">FAQ</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              <ScrambleText text="Questions, answered" scrambleOnView />
            </h2>
            <p className="mt-4 max-w-sm leading-7 text-white/60">
              Still curious? Read the docs for a deeper walkthrough of the build pipeline and export options.
            </p>
            <Link href="/docs" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300">
              Open the docs <ArrowRight className="size-4" />
            </Link>
          </Reveal>
          <div className="divide-y divide-white/10">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="py-5">
                  <h3 className="font-medium text-white">{f.q}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/55">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1} className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-transparent p-10 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-1/2 left-1/2 h-[60vh] w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,#065f46_0%,transparent_70%)] opacity-40 blur-[120px]" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Ship your next idea in one prompt</h2>
              <p className="mx-auto mt-3 max-w-md text-white/60">Describe it once. Get a working, multi-page app with a live preview.</p>
              <Link
                href="#prompt-composer"
                className="glow-button mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Start building <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <RichFooter />
    </div>
  );
}
