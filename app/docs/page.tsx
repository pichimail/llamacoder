import Link from "next/link";

import { PublicPageShell } from "@/components/marketing/public-page-shell";

const docs = [
  { title: "Getting started", href: "/docs/getting-started", body: "Start from the hero composer, choose build intent, authenticate if needed, and launch a live app build." },
  { title: "Agent workflow", href: "/docs/agent-workflow", body: "Understand queue, plan, terminal, reasoning summary, checkpoints, confirmations, and environment variables." },
  { title: "Integrations", href: "/docs/integrations", body: "Connect ChinnaLLM, BYOK, MCP servers, storage, backend routes, and deployment-oriented project settings." },
  { title: "Security", href: "/docs/security", body: "Learn how auth, sandbox previews, secrets, generated code, and project ownership boundaries are handled." },
];

export default function DocsPage() {
  return (
    <PublicPageShell
      eyebrow="Docs"
      title="Build docs for the agentic app workspace."
      description="Short, practical guides for starting builds, reading agent progress, adding integrations, and understanding security boundaries."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {docs.map((doc) => (
          <Link key={doc.href} href={doc.href} className="rounded-xl border border-lime-300/10 bg-white/[0.035] p-5 transition hover:border-lime-300/30 hover:bg-lime-300/[0.06]">
            <h2 className="text-lg font-semibold text-stone-50">{doc.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">{doc.body}</p>
          </Link>
        ))}
      </div>
    </PublicPageShell>
  );
}
