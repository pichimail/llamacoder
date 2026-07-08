import Link from "next/link";

export default function TermsOfService() {
  return (
    <main className="min-h-dvh bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        <h1 className="text-4xl font-bold tracking-tight mt-8 mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: July 8, 2026</p>
        
        <div className="prose prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>By using Chinna-Coder (the "Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>

          <h2>2. Description of Service</h2>
          <p>Chinna-Coder provides an AI-powered platform that generates web, mobile, and 3D applications from natural language prompts. The Service includes live previews, code export, deployment helpers, and related features.</p>

          <h2>3. User Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account.</p>

          <h2>4. User Content and Prompts</h2>
          <p>You retain ownership of the prompts and ideas you submit. By using the Service, you grant us a license to process them to generate apps. You are responsible for ensuring your prompts do not violate laws or third-party rights.</p>

          <h2>5. Generated Code</h2>
          <p>You own the code generated for you by the Service. You may export, modify, and use it as you wish, subject to any third-party dependencies or licenses in the generated output.</p>

          <h2>6. Acceptable Use</h2>
          <p>You may not use the Service to generate illegal, harmful, or abusive content. We reserve the right to suspend accounts that violate this.</p>

          <h2>7. AI Models and Third Parties</h2>
          <p>The Service uses third-party AI providers (e.g., Together AI, Claude models). Their terms may apply to generated output.</p>

          <h2>8. Limitation of Liability</h2>
          <p>The Service is provided "as is". We are not liable for any damages arising from use of the Service or generated apps.</p>

          <h2>9. Changes</h2>
          <p>We may update these Terms. Continued use after changes constitutes acceptance.</p>

          <h2>10. Contact</h2>
          <p>Questions: support@chinna-coder.example.com</p>
        </div>
      </div>
    </main>
  );
}
