import Link from "next/link";
import Header from "@/components/header";

export default function FeaturedNotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-start justify-center px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Template not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This featured app does not exist or has no sandbox files yet.
        </p>
        <Link
          href="/gallery"
          className="mt-6 inline-flex h-9 items-center rounded-md border border-border px-3 text-sm transition hover:bg-accent"
        >
          Browse gallery
        </Link>
      </div>
    </main>
  );
}