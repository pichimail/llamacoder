import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalBody } from "@/components/marketing/legal-body";

export const metadata: Metadata = {
  title: "Terms of Service — Chinna-Coder",
  description: "The terms that govern your use of Chinna-Coder.",
};

export default function TermsOfService() {
  return (
    <MarketingShell eyebrow="Legal" title="Terms of Service" description="Last updated: July 8, 2026">
      <LegalBody>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By using Chinna-Coder (the &ldquo;Service&rdquo;), you agree to these Terms of Service. If you do not agree,
          do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Chinna-Coder provides an AI-powered platform that generates web, mobile, and 3D applications from natural
          language prompts. The Service includes live previews, code export, deployment helpers, and related features.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You must provide accurate information when creating an account. You are responsible for maintaining the
          confidentiality of your account.
        </p>

        <h2>4. User Content and Prompts</h2>
        <p>
          You retain ownership of the prompts and ideas you submit. By using the Service, you grant us a license to
          process them to generate apps. You are responsible for ensuring your prompts do not violate laws or
          third-party rights.
        </p>

        <h2>5. Generated Code</h2>
        <p>
          You own the code generated for you by the Service. You may export, modify, and use it as you wish, subject to
          any third-party dependencies or licenses in the generated output.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>
          You may not use the Service to generate illegal, harmful, or abusive content. We reserve the right to suspend
          accounts that violate this.
        </p>

        <h2>7. AI Models and Third Parties</h2>
        <p>The Service uses third-party AI providers. Their terms may apply to generated output.</p>

        <h2>8. Limitation of Liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo;. We are not liable for any damages arising from use of the Service
          or generated apps.
        </p>

        <h2>9. Changes</h2>
        <p>We may update these Terms. Continued use after changes constitutes acceptance.</p>

        <h2>10. Contact</h2>
        <p>
          Questions: <a href="mailto:support@chinna-coder.example.com">support@chinna-coder.example.com</a>
        </p>
      </LegalBody>
    </MarketingShell>
  );
}
