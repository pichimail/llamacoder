import { getPrisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { SUGGESTED_PROMPTS } from "@/lib/constants";
import { buildOgImagePath } from "@/lib/og-shared";
import Header from "@/components/header";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { ExternalLink, Hammer } from "lucide-react";

export const metadata: Metadata = {
  title: "Gallery — Chinna-Coder",
  description: "Community builds and one-click templates.",
  openGraph: { images: ["/api/og?prompt=Gallery"] },
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const settings = await getSettings();
  if (settings.gallery === "off") {
    return (
      <main className="flex h-dvh flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          The gallery is currently disabled.
        </div>
      </main>
    );
  }

  const prisma = getPrisma();
  // Real data: latest chats that actually produced files, with their newest shareable version
  const chats = await prisma.chat
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        messages: {
          where: { role: "assistant" },
          orderBy: { position: "desc" },
          take: 1,
          select: { id: true, files: true },
        },
      },
    })
    .catch(() => []);

  const builds = chats
    .map((c) => ({
      id: c.id,
      title: c.title || "Untitled build",
      model: c.model.split("/").pop() || c.model,
      shareMessageId: c.messages[0]?.id,
      fileCount: Array.isArray(c.messages[0]?.files)
        ? (c.messages[0]!.files as any[]).length
        : 0,
    }))
    .filter((b) => b.shareMessageId);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Featured sandbox templates, quick-start prompts, and recent community builds.
        </p>

        <h2 className="mt-8 text-lg font-semibold tracking-tight">Featured apps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a live sandbox preview, then remix any template in the builder.
        </p>
        <div className="mt-4">
          <FeaturedAppsGrid limit={6} />
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Quick-start prompts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One click drops the prompt into the builder.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTED_PROMPTS.map((t) => (
            <Link
              key={t.title}
              href={`/?prompt=${encodeURIComponent(t.description)}`}
              className="group rounded-xl border border-border/70 bg-card/50 p-4 transition hover:border-ring/40 hover:bg-card"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Hammer
                  className="size-3.5 text-emerald-500"
                  aria-hidden="true"
                />
                {t.title}
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {t.description}
              </p>
            </Link>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">
          Recent builds
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live apps generated on this instance.
        </p>
        {builds.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing here yet — be the first to build something.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {builds.map((b) => (
              <div
                key={b.id}
                className="overflow-hidden rounded-xl border border-border/70 bg-card/50"
              >
                {b.shareMessageId ? (
                  <div className="relative aspect-[1200/630] border-b border-border/70 bg-muted/40">
                    <Image
                      src={buildOgImagePath({
                        prompt: b.title,
                        messageId: b.shareMessageId,
                      })}
                      alt={`Preview card for ${b.title}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="p-4">
                <div className="truncate text-sm font-medium">{b.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {b.model} · {b.fileCount} files
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <a
                    href={`/share/v2/${b.shareMessageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" /> Live
                  </a>
                  <Link
                    href={`/chats/${b.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    Open in builder
                  </Link>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
