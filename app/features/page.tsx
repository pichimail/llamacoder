import Link from "next/link";

import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function FeaturesPage() {
  return (
    <PublicPageShell
      eyebrow="Features"
      title="A workspace for prompts that need real product shape."
      description="Chinna-Coder turns app requests into routed interfaces, previewable artifacts, backend-ready files, and iteration tools without hiding the code."
    >
      <InfoGrid
        items={[
          { title: "Agentic build loop", body: "Queue, plan, terminal, checkpoint, and confirmation surfaces keep each build legible while the artifact is being assembled." },
          { title: "Prompt to routed app", body: "Dashboards, admin panels, mobile-first apps, marketing sites, 3D scenes, and tools generate as real route structures rather than one giant demo page." },
          { title: "Live preview", body: "The preview runs generated React/Next files in a sandbox with dependency support for shadcn-style UI, charts, GSAP, Three.js, and more." },
          { title: "Backend-ready mode", body: "When the prompt needs persistence, the builder can produce Prisma schemas, API routes, server helpers, and environment variable guidance." },
          { title: "Design controls", body: "Style presets and custom design references steer the output so buttons, forms, surfaces, and contrast match the requested direction." },
          { title: "Export path", body: "Artifacts can move from chat to project workspace, ZIP, GitHub workflow, or deployment preparation without losing file context." },
        ]}
      />
      <div className="mt-10 rounded-xl border border-lime-300/15 bg-lime-300/[0.06] p-5">
        <h2 className="text-xl font-semibold text-lime-100">Build with the full agent view</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          Use the hero composer to start a build, then continue inside chat with queue, terminal, reasoning summary, checkpoints, environment variables, and attachments.
        </p>
        <Link href="/#prompt-composer" className="mt-4 inline-flex rounded-lg bg-lime-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-lime-100">
          Start a build
        </Link>
      </div>
    </PublicPageShell>
  );
}
