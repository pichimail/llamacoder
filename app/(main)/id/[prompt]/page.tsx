import CodeRunner from "@/components/code-runner";
import Header from "@/components/header";
import {
  featuredAppBuilderHref,
} from "@/lib/featured-apps";
import { getFeaturedAppBySlugAsync } from "@/lib/featured-apps-server";
import { getFilesForFeaturedApp } from "@/lib/featured-app-files";
import { getMotionTemplateBySlug } from "@/lib/motion-templates";
import { buildOgImagePath } from "@/lib/og-shared";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hammer, Sparkles } from "lucide-react";

type PageProps = { params: Promise<{ prompt: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prompt: slug } = await params;
  const motion = getMotionTemplateBySlug(slug);
  const app = motion ?? (await getFeaturedAppBySlugAsync(slug));
  const title = app?.title ?? decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  const description =
    app?.description ?? "Preview and remix this app template in Chinna-Coder.";

  return {
    title: `${title} — Template`,
    description,
    openGraph: {
      images: [buildOgImagePath({ prompt: app?.prompt ?? title })],
    },
  };
}

export default async function FeaturedSandboxPage({ params }: PageProps) {
  const { prompt: slug } = await params;
  const motion = getMotionTemplateBySlug(slug);

  if (motion) {
    return (
      <main className="flex min-h-dvh flex-col bg-background text-foreground">
        <Header />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10 pt-8">
          <Link
            href="/gallery?source=motion"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Motion templates
          </Link>
          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-500">
            <Sparkles className="size-4" aria-hidden="true" />
            Motion template
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{motion.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {motion.description}
          </p>
          <p className="mt-4 rounded-lg border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
            {motion.prompt}
          </p>
          <Link
            href={featuredAppBuilderHref(motion.prompt)}
            className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-md border border-border bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
          >
            <Hammer className="size-3.5" aria-hidden="true" />
            Generate this template
          </Link>
        </div>
      </main>
    );
  }

  const app = await getFeaturedAppBySlugAsync(slug);
  if (!app) {
    notFound();
  }

  const files = await getFilesForFeaturedApp(app);
  if (files.length === 0) {
    notFound();
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-4">
          <div className="min-w-0">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Gallery
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{app.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{app.description}</p>
          </div>
          <Link
            href={featuredAppBuilderHref(app.prompt)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            <Hammer className="size-3.5" aria-hidden="true" />
            Remix in builder
          </Link>
        </div>

        <div className="mt-4 min-h-[min(72dvh,720px)] flex-1 overflow-hidden rounded-xl border border-border/70 bg-card/30">
          <CodeRunner files={files} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Live sandbox preview · {files.length} file{files.length === 1 ? "" : "s"}
          {app.pinned ? " · Pinned featured app" : ""}
        </p>
      </div>
    </main>
  );
}