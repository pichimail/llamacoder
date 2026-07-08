import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, LogIn, ShieldCheck, Sparkles } from "lucide-react";

import { continueWithGoogle } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const reasons = [
  "Resume prompts after sign-in",
  "Save chats, previews, and checkpoints",
  "Keep credits, settings, and projects private",
] as const;

export default async function LoginPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-[#070806] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(190,242,100,0.14),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.10),transparent_30%),linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:auto,auto,44px_44px,44px_44px]" />
      <header className="border-b border-lime-300/10 bg-[#070806]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-stone-50">
            <span className="grid size-9 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-lime-100">C</span>
            Chinna-Coder
          </Link>
          <Link href="/docs/security" className="hidden text-sm text-stone-400 hover:text-lime-100 sm:inline">
            Security
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-70px)] max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-100">
            <LockKeyhole className="size-3.5" />
            Protected workspace access
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-50 sm:text-6xl">
            Sign in once. Keep every build attached.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
            Google sign-in unlocks chats, credits, settings, projects, and admin tools while public pages stay open for browsing.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {reasons.map((reason) => (
              <div key={reason} className="rounded-xl border border-lime-300/10 bg-white/[0.035] p-4">
                <CheckCircle2 className="size-4 text-lime-200" />
                <p className="mt-3 text-sm leading-5 text-stone-300">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-[1px] rounded-2xl bg-[linear-gradient(145deg,rgba(190,242,100,0.42),rgba(251,191,36,0.15),rgba(255,255,255,0.05))] blur-sm" />
          <section className="relative overflow-hidden rounded-2xl border border-lime-300/18 bg-[#0d0f0a]/95 p-5 shadow-2xl shadow-black/45 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/75">Account</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">Continue with Google</h2>
              </div>
              <div className="grid size-11 place-items-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-100">
                <Sparkles className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-400">
              We use authentication to protect generated projects and route your saved prompts back into the right workspace.
            </p>

            <form action={continueWithGoogle} className="mt-7">
              <Button type="submit" className="h-11 w-full rounded-lg bg-lime-200 text-stone-950 hover:bg-lime-100">
                <LogIn className="size-4" />
                Continue with Google
              </Button>
            </form>
            <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-lg border-lime-300/20 bg-transparent text-lime-100 hover:bg-lime-300/10">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to public site
              </Link>
            </Button>

            <div className="mt-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-100" />
                <p className="text-sm leading-6 text-stone-300">
                  Admin access is still controlled by the configured admin account. Signing in does not grant admin privileges by itself.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
