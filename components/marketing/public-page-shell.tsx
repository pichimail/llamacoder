import Link from "next/link";
import type { ReactNode } from "react";

import { RichFooter } from "@/components/rich-footer";

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#070806] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(190,242,100,0.12),transparent_34%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
      <header className="border-b border-lime-300/10 bg-[#070806]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-semibold text-stone-50">Chinna-Coder</Link>
          <nav className="flex items-center gap-4 text-sm text-stone-400">
            <Link href="/features" className="hover:text-lime-100">Features</Link>
            <Link href="/docs" className="hover:text-lime-100">Docs</Link>
            <Link href="/about" className="hover:text-lime-100">About</Link>
            <Link href="/pricing" className="hidden hover:text-lime-100 sm:inline">Pricing</Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-200/80">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-stone-50 sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-400 sm:text-lg">{description}</p>
      </section>
      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8">{children}</div>
      <RichFooter />
    </main>
  );
}

export function InfoGrid({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <section key={item.title} className="rounded-xl border border-lime-300/10 bg-white/[0.035] p-5">
          <h2 className="text-lg font-semibold text-stone-50">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">{item.body}</p>
        </section>
      ))}
    </div>
  );
}
