import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Code2, Cpu, Rocket, Sparkles, Terminal } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Documentation — Chinna-Coder",
  description: "Everything you need to build production-grade apps with AI.",
};

const SECTIONS = [
  {
    icon: Rocket,
    title: "Getting started",
    items: ["Quickstart guide", "How to write great prompts", "Live preview & iteration"],
  },
  {
    icon: Cpu,
    title: "Core features",
    items: ["Full-stack generation", "Design modes", "Databases & auth", "MCP tools"],
  },
  {
    icon: Code2,
    title: "Working with code",
    items: ["Editing generated files", "Export to GitHub", "Bring your own key"],
  },
  {
    icon: Terminal,
    title: "Advanced",
    items: ["Multi-agent builds", "Custom integrations", "Deployment"],
  },
];

import { PublicPageShell } from "@/components/marketing/public-page-shell";

const docs = [
  { title: "Getting started", href: "/docs/getting-started", body: "Start from the hero composer, choose build intent, authenticate if needed, and launch a live app build." },
  { title: "Agent workflow", href: "/docs/agent-workflow", body: "Understand queue, plan, terminal, reasoning summary, checkpoints, confirmations, and environment variables." },
  { title: "Integrations", href: "/docs/integrations", body: "Connect ChinnaLLM, BYOK, MCP servers, storage, backend routes, and deployment-oriented project settings." },
  { title: "Security", href: "/docs/security", body: "Learn how auth, sandbox previews, secrets, generated code, and project ownership boundaries are handled." },
];

export default function DocsPage() {
  return (
    <MarketingShell
      eyebrow="Documentation"
      title="Build with confidence"
      description="Everything you need to go from your first prompt to a deployed, production-grade application."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.06}>
            <div className="border-glow h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>
              <ul className="space-y-2 text-sm text-white/60">
                {s.items.map((it) => (
                  <li key={it} className="transition hover:text-white">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <section id="quickstart" className="mt-20">
        <Reveal>
          <h2 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            Quickstart
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <ol className="mt-6 space-y-3 text-white/70">
            {[
              "Describe your app in the hero prompt composer.",
              "Choose a model and a design mode, then set your toggles.",
              "Hit Send and watch the multi-agent system plan and generate files.",
              "Iterate in the live preview or code editor.",
              "Export to GitHub or deploy.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-300">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section id="prompting" className="mt-16">
        <Reveal>
          <h2 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <BookOpen className="h-6 w-6 text-emerald-400" />
            Writing effective prompts
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-4 max-w-2xl text-white/60">
            Be specific about features, tech stack, and user flows. The more detail you give, the better the first
            version.
          </p>
          <div className="mt-4 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
            <strong className="text-white">Example:</strong> &ldquo;Build a premium sneaker e-commerce store with a 3D
            rotating hero, a product grid with filters, a cart, Stripe checkout, and an admin dashboard for
            inventory.&rdquo;
          </div>
        </Reveal>
      </section>

      <section className="mt-16">
        <Reveal>
          <p className="text-white/60">
            Ready to dive in? Head to{" "}
            <Link href="/" className="text-emerald-400 underline">
              the builder
            </Link>{" "}
            or explore the{" "}
            <Link href="/features" className="text-emerald-400 underline">
              full feature set
            </Link>
            .
          </p>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
