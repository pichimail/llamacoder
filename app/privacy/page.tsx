import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-dvh bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        <h1 className="text-4xl font-bold tracking-tight mt-8 mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: July 8, 2026</p>
        
        <div className="prose prose-invert max-w-none">
          <h2>1. Introduction</h2>
          <p>Chinna-Coder ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered app building platform at chinna-coder.vercel.app (the "Service").</p>

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
          <p>We use the information to:</p>
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
            <li>Service providers (hosting, AI models like Together AI, payment processors)</li>
            <li>When required by law</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your data. Your code is stored securely. We use encryption in transit and at rest where appropriate.</p>

          <h2>6. Your Rights</h2>
          <p>You can request access, correction, or deletion of your data by contacting us. You can delete your projects at any time.</p>

          <h2>7. Cookies and Tracking</h2>
          <p>We use cookies for authentication and analytics. See our Cookie Policy for details.</p>

          <h2>8. Changes to This Policy</h2>
          <p>We may update this policy. We will notify you of material changes.</p>

          <h2>9. Contact Us</h2>
          <p>For questions, email support@chinna-coder.example.com</p>
        </div>
      </div>
    </main>
  );
}
