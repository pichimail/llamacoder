import Link from "next/link";

export default async function PromptShowcasePage({ params }: { params: Promise<{ prompt: string }> }) {
  const { prompt } = await params;
  const decoded = decodeURIComponent(prompt).replace(/[-_]+/g, " ").trim();
  const href = `/?prompt=${encodeURIComponent(decoded)}`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <section className="w-full max-w-2xl border-l border-border pl-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">HyperSpeed</Link>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{decoded || "Build an app"}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Open this prompt in the builder and generate a working sandbox-ready app.</p>
        <Link href={href} className="mt-8 inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition hover:border-foreground/60">
          Start from this prompt
        </Link>
      </section>
    </main>
  );
}
