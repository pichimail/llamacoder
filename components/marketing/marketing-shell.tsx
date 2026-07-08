import Link from "next/link";
import type { ReactNode } from "react";
import { RichFooter } from "@/components/rich-footer";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

/**
 * Shared shell for all marketing / legal / docs pages. Provides the emerald
 * aurora background, a consistent sticky top nav, and the rich footer so every
 * standalone page matches the redesigned landing page.
 */
export function MarketingShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#04070a] text-white">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,#04100c_0%,#04070a_50%,#020403_100%)]" />
        <div className="absolute -top-[30%] left-1/2 h-[70vh] w-[110vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,#065f46_0%,#064e3b_40%,transparent_70%)] opacity-50 blur-[150px]" />
        <div className="absolute top-[10%] -left-[15%] h-[55vh] w-[60vw] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#0f766e_0%,transparent_65%)] opacity-30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-15%] h-[60vh] w-[65vw] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#3f6212_0%,transparent_70%)] opacity-25 blur-[130px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-black">C</span>
          Chinna-Coder
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="glow-button rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-medium text-black transition hover:brightness-110"
        >
          Start building
        </Link>
      </header>

      {/* Page header */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-6 md:pt-16">
        {eyebrow ? (
          <div className="mb-3 text-xs font-medium uppercase tracking-[3px] text-emerald-400">{eyebrow}</div>
        ) : null}
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-white/60">{description}</p>
        ) : null}
      </div>

      {/* Content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20">{children}</main>

      <div className="relative z-10">
        <RichFooter />
      </div>
    </div>
  );
}
