import Link from "next/link";

export default function Docs() {
  return (
    <main className="min-h-dvh bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/docs/getting-started" className="hover:text-foreground">Getting Started</Link>
            <Link href="/docs/features" className="hover:text-foreground">Features</Link>
            <Link href="/docs/api" className="hover:text-foreground">API</Link>
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-4">Chinna-Coder Documentation</h1>
        <p className="text-xl text-muted-foreground mb-12">Everything you need to build production-grade apps with AI.</p>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="#quickstart" className="hover:text-foreground">Quickstart Guide</Link></li>
              <li><Link href="#prompting" className="hover:text-foreground">How to Write Great Prompts</Link></li>
              <li><Link href="#preview" className="hover:text-foreground">Live Preview &amp; Iteration</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>Full-stack generation (React, Next.js, backend)</li>
              <li>3D / WebGL support</li>
              <li>Mobile &amp; app store ready outputs</li>
              <li>Design system integration (shadcn/ui)</li>
              <li>MCP tools &amp; external APIs</li>
              <li>Credits &amp; BYOK</li>
            </ul>
          </div>
        </div>

        <section id="quickstart" className="mt-16">
          <h2 className="text-3xl font-semibold mb-4">Quickstart</h2>
          <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
            <li>Describe your app in the hero prompt composer.</li>
            <li>Choose model, mode (Agent/Plan), toggles (shadcn, backend, etc.).</li>
            <li>Hit Send. Watch the multi-agent system plan and generate files.</li>
            <li>Iterate in the live preview or code editor.</li>
            <li>Export to GitHub or deploy.</li>
          </ol>
        </section>

        <section id="prompting" className="mt-12">
          <h2 className="text-3xl font-semibold mb-4">Writing Effective Prompts</h2>
          <p className="mb-4">Be specific about features, tech stack, and user flows. The more detail, the better the first version.</p>
          <div className="bg-card p-4 rounded-lg border text-sm">
            <strong>Example:</strong> "Build a premium sneaker e-commerce store with 3D rotating hero, product grid with filters, cart, Stripe checkout, and admin dashboard for inventory."
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-semibold mb-4">Advanced</h2>
          <p>See <Link href="/chats" className="text-primary underline">Chats</Link> for iteration, design mode, database mode, and MCP integration.</p>
        </section>
      </div>
    </main>
  );
}
