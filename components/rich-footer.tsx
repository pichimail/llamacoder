import Link from "next/link";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Docs", href: "/docs" },
      { label: "Gallery", href: "/gallery" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security", href: "/docs/security" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "Agent workflow", href: "/docs/agent-workflow" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "New prompt", href: "/#prompt-composer" },
    ],
  },
];

export function RichFooter() {
  return (
    <footer className="border-t border-lime-300/10 bg-[#070806] text-sm text-stone-300">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-3 text-stone-50">
            <span className="grid size-9 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-sm font-semibold text-lime-200 shadow-[0_0_32px_rgba(190,242,100,0.12)]">
              C
            </span>
            <span className="text-base font-semibold tracking-tight">Chinna-Coder</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-400">
            Agentic app building for teams who want the source, preview, dashboard, and launch path in one focused workspace.
          </p>
          <p className="mt-6 text-xs text-stone-500">
            © {new Date().getFullYear()} Chinna-Coder. All rights reserved.
          </p>
        </div>
<<<<<<< HEAD
        <div>
          <div className="font-medium text-white/80 mb-2">Product</div>
          <div className="space-y-1">
            <Link href="/features" className="block hover:text-white">Features</Link>
            <Link href="/docs" className="block hover:text-white">Docs</Link>
            <Link href="/gallery" className="block hover:text-white">Gallery</Link>
          </div>
        </div>
        <div>
          <div className="font-medium text-white/80 mb-2">Company</div>
          <div className="space-y-1">
            <Link href="/about" className="block hover:text-white">About</Link>
            <Link href="/pricing" className="block hover:text-white">Pricing</Link>
            <Link href="/privacy" className="block hover:text-white">Privacy</Link>
            <Link href="/terms" className="block hover:text-white">Terms</Link>
          </div>
        </div>
        <div>
          <div className="font-medium text-white/80 mb-2">Resources</div>
          <div className="space-y-1">
            <a href="https://github.com" className="block hover:text-white">GitHub</a>
            <Link href="/docs" className="block hover:text-white">Documentation</Link>
            <Link href="/about" className="block hover:text-white">Security</Link>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 text-xs">
          © {new Date().getFullYear()} Chinna-Coder. All rights reserved.<br />
          Built with love and lots of AI.
=======
        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/80">{group.title}</h2>
              <div className="mt-4 grid gap-2">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-stone-400 transition hover:text-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
>>>>>>> 9c7536dbf9f8471c76b368a07f876eb1f010b903
        </div>
      </div>
    </footer>
  );
}
