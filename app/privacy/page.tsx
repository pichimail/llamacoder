<<<<<<< HEAD
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalBody } from "@/components/marketing/legal-body";

export const metadata: Metadata = {
  title: "Privacy Policy — Chinna-Coder",
  description: "How Chinna-Coder collects, uses, and protects your information.",
};
=======
import { InfoGrid, PublicPageShell } from "@/components/marketing/public-page-shell";
>>>>>>> 9c7536dbf9f8471c76b368a07f876eb1f010b903

export default function PrivacyPage() {
  return (
<<<<<<< HEAD
    <MarketingShell eyebrow="Legal" title="Privacy Policy" description="Last updated: July 8, 2026">
      <LegalBody>
        <h2>1. Introduction</h2>
        <p>
          Chinna-Coder (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
          use our AI-powered app building platform (the &ldquo;Service&rdquo;).
        </p>

        <h2>2. Information We Collect</h2>
        <p>We collect information that you provide directly to us:</p>
        <ul>
          <li>Account information (email, name, avatar from Google sign-in)</li>
          <li>Prompts and app descriptions you enter</li>
          <li>Generated code, files, and projects</li>
          <li>Usage data and preferences</li>
          <li>Payment information (via Stripe for premium plans)</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>Provide and improve the Service</li>
          <li>Generate and preview apps based on your prompts</li>
          <li>Save and manage your projects and chats</li>
          <li>Communicate with you about your account</li>
          <li>Detect and prevent abuse</li>
        </ul>

        <h2>4. Sharing of Information</h2>
        <p>We do not sell your personal information. We may share with:</p>
        <ul>
          <li>Service providers (hosting, AI model providers, payment processors)</li>
          <li>When required by law</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your data. Your code is stored
          securely, using encryption in transit and at rest where appropriate.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          You can request access, correction, or deletion of your data by contacting us. You can delete your projects
          at any time.
        </p>

        <h2>7. Cookies and Tracking</h2>
        <p>We use cookies for authentication and analytics. See our Cookie Policy for details.</p>

        <h2>8. Changes to This Policy</h2>
        <p>We may update this policy. We will notify you of material changes.</p>

        <h2>9. Contact Us</h2>
        <p>
          For questions, email <a href="mailto:support@chinna-coder.example.com">support@chinna-coder.example.com</a>
        </p>
      </LegalBody>
    </MarketingShell>
=======
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
>>>>>>> 9c7536dbf9f8471c76b368a07f876eb1f010b903
  );
}
