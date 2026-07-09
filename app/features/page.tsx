import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  Cpu,
  Database,
  GitBranch,
  Globe,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Features — Chinna-Coder",
  description:
    "Full-stack AI generation, live preview, design modes, databases, auth, MCP tools, and one-click export. Everything you need to go from prompt to production.",
};

const FEATURES = [
  {
    icon: Wand2,
    title: "Prompt to full-stack app",
    desc: "Describe your idea in plain language. A multi-agent system plans, writes, and validates real code across frontend, backend, and data.",
  },
  {
    icon: Zap,
    title: "Live preview & hot reload",
    desc: "Every change renders instantly in an isolated sandbox. Watch your app come alive as it is generated, file by file.",
  },
  {
    icon: Palette,
    title: "Strict design modes",
    desc: "Pick a design direction and it is enforced exactly — no drift, no generic AI slop. Your selected aesthetic wins every time.",
  },
  {
    icon: Database,
    title: "Databases & auth built in",
    desc: "Wire up Postgres, Redis, and authentication without leaving the chat. Schema, queries, and sessions handled for you.",
  },
  {
    icon: Workflow,
    title: "MCP tools & integrations",
    desc: "Connect external services through the Model Context Protocol — issue trackers, docs, analytics, and more.",
  },
  {
    icon: GitBranch,
    title: "Export to GitHub or ZIP",
    desc: "Own your code. Push to a repo or download a ZIP any time. No lock-in, no black boxes.",
  },
  {
    icon: Layers,
    title: "Component-first architecture",
    desc: "Generated projects are split into clean, reusable components following modern best practices.",
  },
  {
    icon: Cpu,
    title: "Choose your model",
    desc: "Route builds through the model that fits the task, or bring your own key for full control over cost and speed.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "Isolated execution, encrypted secrets, and per-user scoping keep your projects and data protected.",
  },
];

const WORKFLOW = [
  { icon: Sparkles, step: "01", title: "Describe", desc: "Type what you want to build and pick a design mode." },
  { icon: Boxes, step: "02", title: "Generate", desc: "Agents plan, code, and validate a working app." },
  { icon: Globe, step: "03", title: "Ship", desc: "Preview live, iterate, then export or deploy." },
];

export default function FeaturesPage() {
  return (
    <MarketingShell
      eyebrow="Features"
      title="Everything you need to ship real software"
      description="Chinna-Coder is a complete AI build environment — not a toy. From the first prompt to a deployed app, every capability is designed to get you to production faster."
    >
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <div className="border-glow group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <section className="mt-24">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight">How a build flows</h2>
          <p className="mt-2 text-white/60">Three steps, from idea to shipped.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {WORKFLOW.map((w, i) => (
            <Reveal key={w.step} delay={i * 0.08}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="absolute right-4 top-4 font-mono text-5xl font-bold text-white/5">{w.step}</div>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                  <w.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{w.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-10 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Ready to build something exceptional?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-white/60">
              Start with a single prompt. Your selected design mode is respected exactly, and the preview is live from the first file.
            </p>
            <Link
              href="/"
              className="glow-button mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 font-medium text-black transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Start building free
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
