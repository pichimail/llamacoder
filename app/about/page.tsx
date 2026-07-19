import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About"
      title="A builder for people who want working software, not a prompt souvenir."
      description="Chinna-Coder is shaped around a simple idea: the assistant should build carefully, expose its working state clearly, and leave you with files you can keep improving."
    >
      <InfoGrid
        items={[
          { title: "Code stays visible", body: "Generated files, routes, and previews remain inspectable so teams can understand and continue the work." },
          { title: "Design matters", body: "The builder avoids generic one-style output by carrying style direction, layout intent, and accessibility rules into generation." },
          { title: "Agentic by default", body: "Complex builds are treated as workflows: plan the product, queue the tasks, stream progress, confirm risky actions, and checkpoint useful versions." },
          { title: "Practical integrations", body: "AI, MCP, BYOK, storage, database, and deployment flows are routed through platform-safe interfaces instead of exposing secrets in generated clients." },
        ]}
      />
    </PublicPageShell>
  );
}
