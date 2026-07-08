import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function IntegrationsDocsPage() {
  return (
    <PublicPageShell
      eyebrow="Docs / Integrations"
      title="Connect real services without putting secrets in generated clients."
      description="Chinna-Coder keeps AI, storage, MCP, and backend integration details behind platform-safe routes and workspace settings."
    >
      <InfoGrid
        items={[
          { title: "ChinnaLLM", body: "Generated AI features call the platform SDK route so model routing, credits, BYOK, and fallbacks stay centralized." },
          { title: "MCP servers", body: "Attached MCP servers are listed as connected tools and should be called through proxy routes, not raw client-side tokens." },
          { title: "Database mode", body: "Backend-enabled builds can include Prisma schemas, API routes, and environment variable guidance for Postgres/Neon." },
          { title: "Assets and uploads", body: "Attachments and screenshots are routed through Blob upload configuration when available, with local fallback messaging when not." },
        ]}
      />
    </PublicPageShell>
  );
}
