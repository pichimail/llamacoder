import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="How Chinna-Coder handles account, prompt, and project data."
      description="This page summarizes the product privacy posture for the app-building workspace. It is product information, not legal advice."
    >
      <InfoGrid
        items={[
          { title: "Data we process", body: "Account profile data from sign-in, prompts, attachments, generated files, project metadata, preferences, and usage events needed to operate the service." },
          { title: "How it is used", body: "We use data to create chats, generate artifacts, preserve projects, route AI requests, improve reliability, and protect the platform from abuse." },
          { title: "AI providers", body: "Prompts and context may be sent to configured model providers through ChinnaLLM routing or BYOK flows when required to generate a response." },
          { title: "Secrets", body: "API keys and environment variables should be stored through platform settings or secure provider flows and must not be embedded in generated client code." },
          { title: "Cookies", body: "Essential cookies support authentication and workspace continuity. Optional analytics may be used only to improve product reliability and experience." },
          { title: "Your control", body: "You can remove projects, update settings, use BYOK where available, and request correction or deletion of account data through support." },
        ]}
      />
    </PublicPageShell>
  );
}
