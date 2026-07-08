<<<<<<< HEAD
import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Heart, Rocket, Users } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "About — Chinna-Coder",
  description:
    "We are building the fastest path from idea to shipped software. Learn about the mission, values, and people behind Chinna-Coder.",
};

const VALUES = [
  {
    icon: Rocket,
    title: "Ship, don't stall",
    desc: "Software should exist to be used. We optimize relentlessly for the moment your idea becomes something real and running.",
  },
  {
    icon: Compass,
    title: "You stay in control",
    desc: "Your design choices are respected exactly, your code is exportable, and there is no lock-in. The AI serves your intent.",
  },
  {
    icon: Heart,
    title: "Craft over slop",
    desc: "We refuse generic, cookie-cutter output. Every generated app should feel considered, distinctive, and production-quality.",
  },
  {
    icon: Users,
    title: "Built with builders",
    desc: "Every feature is shaped by the people who use it. We build in the open and listen closely to our community.",
  },
];

const STATS = [
  { value: "500K+", label: "Apps generated" },
  { value: "120+", label: "Countries" },
  { value: "1.2s", label: "Avg. first preview" },
  { value: "99.9%", label: "Uptime" },
];

export default function AboutPage() {
  return (
    <MarketingShell
      eyebrow="About us"
      title="We turn ideas into working software"
      description="Chinna-Coder started with a simple frustration: the distance between having an idea and shipping it was too long. So we built an AI environment that closes that gap — without sacrificing control or craft."
    >
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="bg-gradient-to-b from-emerald-200 to-teal-400 bg-clip-text text-4xl font-bold text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-white/50">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="mt-24 grid gap-10 md:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Our mission</h2>
            <p className="mt-4 leading-relaxed text-white/60">
              We believe the ability to build software should belong to everyone with an idea — not only those who
              have spent years learning to code. Chinna-Coder is our answer: a system that understands what you want,
              builds it faithfully, and hands you real, ownable code at the end.
            </p>
            <p className="mt-4 leading-relaxed text-white/60">
              We are not interested in demos that fall apart. We care about apps that run, scale, and feel genuinely
              well-made. That is the bar we hold ourselves to on every build.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="border-glow rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-8">
            <blockquote className="text-xl font-medium leading-relaxed text-white/90">
              &ldquo;The best tool disappears. You should be thinking about your product, not fighting your
              tooling.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 font-semibold text-black">
                C
              </div>
              <div>
                <div className="text-sm font-medium">The Chinna-Coder Team</div>
                <div className="text-xs text-white/50">Founders</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mt-24">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight">What we value</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06]">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{v.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-10 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Join us on the journey</h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-white/60">
              Whether you are shipping your first app or your hundredth, we would love to have you build with us.
            </p>
            <Link
              href="/"
              className="glow-button mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 font-medium text-black transition hover:brightness-110"
            >
              <Rocket className="h-4 w-4" />
              Start building
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
=======
import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About"
      title="A builder for people who want working software, not a prompt souvenir."
      description="Chinna-Coder is shaped around a simple idea: the assistant should build carefully, expose its working state clearly, and leave you with files you can keep improving."
    >
      <InfoGrid
        items={[
          { title: "Code stays visible", body: "Generated files, routes, and previews remain inspectable so teams can understand and continue the work." },
          { title: "Design matters", body: "The builder avoids generic one-style output by carrying style direction, layout intent, and accessibility rules into generation." },
          { title: "Agentic by default", body: "Complex builds are treated as workflows: plan the product, queue the tasks, stream progress, confirm risky actions, and checkpoint useful versions." },
          { title: "Practical integrations", body: "AI, MCP, BYOK, storage, database, and deployment flows are routed through platform-safe interfaces instead of exposing secrets in generated clients." },
        ]}
      />
    </PublicPageShell>
>>>>>>> 9c7536dbf9f8471c76b368a07f876eb1f010b903
  );
}
