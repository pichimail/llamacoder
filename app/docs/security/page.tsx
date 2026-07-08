import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function SecurityDocsPage() {
  return (
    <PublicPageShell
      eyebrow="Docs / Security"
      title="Security boundaries for generated workspaces."
      description="Generated previews are useful because they are isolated from production secrets and because protected routes stay tied to authenticated users."
    >
      <InfoGrid
        items={[
          { title: "Authenticated workspace", body: "Sidebar, chats, dashboard, credits, settings, and project workspace routes require a signed-in account when auth is enabled." },
          { title: "Secret handling", body: "API keys and provider credentials belong in platform settings, BYOK storage, or environment variables, not generated client code." },
          { title: "Preview sandbox", body: "Generated artifacts are rendered in a client sandbox and should use preview-safe adapters for server or database behavior." },
          { title: "Ownership checks", body: "Project and chat APIs should use existing access-control helpers so users can only access their own work unless explicitly shared." },
        ]}
      />
    </PublicPageShell>
  );
}
