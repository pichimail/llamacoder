import Link from "next/link";
import { ArrowRight, Check, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { PublicPageShell } from "@/components/marketing/public-page-shell";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    summary: "For first builds, tests, and quick prototypes.",
    cta: "Start free",
    href: "/#prompt-composer",
    featured: false,
    included: [
      "100 monthly credits",
      "Starter ChinnaLLM model tier",
      "Public docs and gallery access",
      "Prompt-to-preview workflow",
    ],
    muted: ["Backend mode", "Custom domains"],
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "per month",
    summary: "For builders who need richer models and backend-ready apps.",
    cta: "Join upgrade waitlist",
    href: "/login",
    featured: true,
    included: [
      "1,000 monthly credits",
      "Starter and Pro ChinnaLLM model tiers",
      "Backend mode and env guidance",
      "Checkpoint restore and preview repair",
    ],
    muted: ["Team governance"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "workspace plan",
    summary: "For teams that need governance, limits, and deployment controls.",
    cta: "Talk to us",
    href: "/about",
    featured: false,
    included: [
      "Custom credit allocation",
      "All ChinnaLLM model tiers",
      "Admin controls and audit-oriented workflows",
      "Custom domains and rollout planning",
    ],
    muted: [],
  },
] as const;

const comparison = [
  ["Model access", "Starter", "Starter + Pro", "All tiers"],
  ["Backend mode", "Preview only", "Included", "Included"],
  ["Workspace controls", "Personal", "Personal", "Team governance"],
  ["Custom domains", "Not included", "Included", "Included"],
] as const;

export default function PricingPage() {
  return (
    <PublicPageShell
      eyebrow="Pricing"
      title="Choose the build lane before the model meter starts running."
      description="Chinna-Coder pricing is shaped around credits, model access, and whether your generated apps need backend and workspace controls."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={[
              "relative flex min-h-[430px] flex-col rounded-2xl border p-5 shadow-2xl shadow-black/25",
              plan.featured
                ? "border-lime-300/35 bg-[linear-gradient(145deg,rgba(190,242,100,0.14),rgba(251,191,36,0.08),rgba(255,255,255,0.04))]"
                : "border-lime-300/10 bg-white/[0.035]",
            ].join(" ")}
          >
            {plan.featured ? (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-1 text-[11px] font-semibold text-lime-100">
                <Sparkles className="size-3.5" />
                Recommended
              </div>
            ) : null}
            <div>
              <h2 className="text-xl font-semibold text-stone-50">{plan.name}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">{plan.summary}</p>
              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight text-stone-50">{plan.price}</span>
                <span className="pb-1 text-sm text-stone-500">{plan.cadence}</span>
              </div>
            </div>

            <div className="mt-7 flex flex-1 flex-col gap-3">
              {plan.included.map((item) => (
                <PlanLine key={item} active>
                  {item}
                </PlanLine>
              ))}
              {plan.muted.map((item) => (
                <PlanLine key={item}>{item}</PlanLine>
              ))}
            </div>

            <Button asChild className={plan.featured ? "mt-7 rounded-lg bg-lime-200 text-stone-950 hover:bg-lime-100" : "mt-7 rounded-lg border-lime-300/20 bg-transparent text-lime-100 hover:bg-lime-300/10"} variant={plan.featured ? "default" : "outline"}>
              <Link href={plan.href}>
                {plan.cta}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-lime-300/10 bg-[#0d0f0a] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/75">Plan logic</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">Credits pay for generation. Controls scale with risk.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Free is for trying the builder. Pro unlocks heavier app work. Enterprise adds the governance layer teams need before generated apps reach production workflows.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-4 bg-white/[0.035] text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              <div className="p-3">Feature</div>
              <div className="p-3">Free</div>
              <div className="p-3 text-lime-100">Pro</div>
              <div className="p-3">Enterprise</div>
            </div>
            {comparison.map((row) => (
              <div key={row[0]} className="grid grid-cols-4 border-t border-white/10 text-sm text-stone-300">
                {row.map((cell, index) => (
                  <div key={`${row[0]}-${index}`} className={index === 0 ? "p-3 font-medium text-stone-100" : "p-3 text-stone-400"}>
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-5">
          <KeyRound className="size-5 text-amber-100" />
          <h2 className="mt-4 text-xl font-semibold text-stone-50">Bring your own keys when apps need AI.</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">Generated apps can request provider keys through the agentic environment panel instead of hiding requirements in code.</p>
        </div>
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.055] p-5">
          <ShieldCheck className="size-5 text-lime-100" />
          <h2 className="mt-4 text-xl font-semibold text-stone-50">Workspace features stay authenticated.</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">Billing, credits, settings, projects, and chats stay behind Google sign-in while public pages remain open.</p>
        </div>
      </section>
    </PublicPageShell>
  );
}

function PlanLine({ children, active = false }: { children: string; active?: boolean }) {
  return (
    <div className="flex gap-3 text-sm leading-6">
      <Check className={active ? "mt-1 size-4 shrink-0 text-lime-200" : "mt-1 size-4 shrink-0 text-stone-600"} aria-hidden="true" />
      <span className={active ? "text-stone-200" : "text-stone-500"}>{children}</span>
    </div>
  );
}
