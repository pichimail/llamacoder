import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="Usage terms for building and exporting generated apps."
      description="These terms explain the product boundaries for using Chinna-Coder. They are a practical product summary, not formal legal advice."
    >
      <InfoGrid
        items={[
          { title: "Using the service", body: "You are responsible for the prompts, uploads, integrations, and generated artifacts you create through the platform." },
          { title: "Generated code", body: "You may inspect, edit, export, and use generated code, subject to licenses for any third-party packages included in the artifact." },
          { title: "Acceptable use", body: "Do not use the platform to create harmful, illegal, abusive, infringing, or credential-stealing software or content." },
          { title: "AI output", body: "AI-generated output can contain mistakes. Review generated code, dependencies, security behavior, and legal/compliance requirements before production use." },
          { title: "Accounts", body: "You are responsible for maintaining access to your account and for any activity initiated from your authenticated workspace." },
          { title: "Service changes", body: "Features, model routing, credits, and integrations may change as the platform improves and provider availability shifts." },
        ]}
      />
    </PublicPageShell>
  );
}
