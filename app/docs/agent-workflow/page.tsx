import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function AgentWorkflowDocsPage() {
  return (
    <PublicPageShell
      eyebrow="Docs / Agent workflow"
      title="How the builder exposes agent work."
      description="The chat composer is designed to make the build state visible without leaking hidden reasoning or burying important confirmations."
    >
      <InfoGrid
        items={[
          { title: "Queue", body: "Shows the next build tasks and whether each task is pending or complete." },
          { title: "Plan", body: "Summarizes the intended implementation shape before and during longer build requests." },
          { title: "Terminal", body: "Surfaces install, compile, preview, and validation output in a compact scrollable console." },
          { title: "Reasoning summary", body: "Shows safe summaries of decision points and current progress without exposing hidden chain-of-thought." },
          { title: "Checkpoints", body: "Makes useful generated versions visible and restorable from the composer area." },
          { title: "Confirmations", body: "Requests approval before actions that affect secrets, integrations, publishing, or destructive changes." },
        ]}
      />
    </PublicPageShell>
  );
}
