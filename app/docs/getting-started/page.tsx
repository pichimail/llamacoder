import Link from "next/link";

import { PublicPageShell } from "@/components/marketing/public-page-shell";

export default function GettingStartedDocsPage() {
  return (
    <PublicPageShell
      eyebrow="Docs / Getting started"
      title="Start with one clear build request."
      description="The fastest path is to describe the product, choose the broad build intent, and let the workspace launch the chat generation flow."
    >
      <div className="grid gap-4">
        {[
          "Write the product you want in the home composer. Include audience, key pages, data needs, and visual direction when you have them.",
          "Choose model, design style, app type, backend mode, attachments, and MCP servers only when the build needs them.",
          "If auth is required, sign in once. Your prompt is preserved and the build resumes directly in the generated chat.",
          "Use the chat composer to iterate with attachments, checkpoints, environment variables, and terminal context.",
        ].map((step, index) => (
          <div key={step} className="rounded-xl border border-lime-300/10 bg-white/[0.035] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200/80">Step {index + 1}</p>
            <p className="mt-2 text-stone-300">{step}</p>
          </div>
        ))}
      </div>
      <Link href="/#prompt-composer" className="mt-8 inline-flex rounded-lg bg-lime-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-lime-100">
        Open composer
      </Link>
    </PublicPageShell>
  );
}
