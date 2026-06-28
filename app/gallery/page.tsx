import { Suspense } from "react";
import { getSettings } from "@/lib/settings";
import { SUGGESTED_PROMPTS } from "@/lib/constants";
import { buildOgImagePath } from "@/lib/og-shared";
import { getMergedFeaturedApps } from "@/lib/featured-apps-server";
import {
  getGalleryCommunityBuilds,
  type GalleryFilters as GalleryFilterParams,
} from "@/lib/gallery-query";
import { MOTION_TEMPLATES } from "@/lib/motion-templates";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { GalleryFilters as GalleryFiltersPanel } from "@/components/gallery-filters";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Hammer } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const legacyQuickStartTitle = "Land" + "ing Page";
const appFirstQuickStarts = SUGGESTED_PROMPTS.map((template) =>
  template.title === legacyQuickStartTitle
    ? {
        title: "Booking App",
        description:
          "Build a premium appointment booking app for a small studio. Include service selection, staff selection, date and time slots, customer details, booking confirmation, and a mobile-first schedule view.",
      }
    : template,
);

export const metadata: Metadata = {
  title: "Gallery — Chinna-Coder",
  description: "Community builds and one-click templates.",
  openGraph: { images: ["/api/og?prompt=Gallery"] },
};

export const dynamic = "force-dynamic";

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): GalleryFilterParams {
  const source = typeof searchParams.source === "string" ? searchParams.source : "all";
  const model = typeof searchParams.model === "string" ? searchParams.model : undefined;
  const minFilesRaw =
    typeof searchParams.minFiles === "string" ? Number(searchParams.minFiles) : 0;

  return {
    source: source as GalleryFilterParams["source"],
    model,
    minFiles: Number.isFinite(minFilesRaw) ? minFilesRaw : 0,
  };
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settings = await getSettings();
  if (settings.gallery === "off") {
    return (
      <main className="flex h-dvh flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4">
          <Empty className="max-w-md">
            <EmptyHeader>
              <EmptyTitle>Gallery disabled</EmptyTitle>
              <EmptyDescription>The gallery is currently disabled from admin settings.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const filters = parseFilters(params);
  const source = filters.source ?? "all";

  const [featuredApps, communityBuilds] = await Promise.all([
    getMergedFeaturedApps(),
    source === "all" || source === "community"
      ? getGalleryCommunityBuilds(filters)
      : Promise.resolve([]),
  ]);

  const showFeatured = source === "all" || source === "featured";
  const showMotion = source === "all" || source === "motion";
  const showTemplates = source === "all" || source === "templates";
  const showCommunity = source === "all" || source === "community";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Featured scaffold previews, motion prompts, quick-starts, and community builds.
        </p>

        <Suspense fallback={null}>
          <GalleryFiltersPanel />
        </Suspense>

        {showFeatured ? (
          <>
            <h2 className="mt-8 text-lg font-semibold tracking-tight">Featured apps</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated templates and admin-pinned generations with stable responsive preview cards.
            </p>
            <div className="mt-4">
              <FeaturedAppsGrid apps={featuredApps} limit={source === "featured" ? undefined : 6} />
            </div>
          </>
        ) : null}

        {showMotion ? (
          <>
            <h2 className="mt-10 text-lg font-semibold tracking-tight">Motion templates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Animation-forward prompts for Framer Motion + shadcn builds.
            </p>
            <div className="mt-4">
              <FeaturedAppsGrid apps={MOTION_TEMPLATES} limit={source === "motion" ? undefined : 3} />
            </div>
          </>
        ) : null}

        {showTemplates ? (
          <>
            <h2 className="mt-10 text-lg font-semibold tracking-tight">Quick-start prompts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One click drops the prompt into the builder.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appFirstQuickStarts.map((template) => (
                <Link
                  key={template.title}
                  href={`/?prompt=${encodeURIComponent(template.description)}`}
                  className="group rounded-xl border border-border/70 bg-card/50 p-4 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-ring/40 hover:bg-card hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Hammer className="size-3.5 text-emerald-500" aria-hidden="true" />
                    {template.title}
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {showCommunity ? (
          <>
            <h2 className="mt-10 text-2xl font-semibold tracking-tight">Recent builds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live apps generated on this instance
              {filters.model ? ` · model contains “${filters.model}”` : ""}
              {filters.minFiles ? ` · ${filters.minFiles}+ files` : ""}.
            </p>
            {communityBuilds.length === 0 ? (
              <Empty className="mt-4">
                <EmptyHeader>
                  <EmptyTitle>No builds match these filters</EmptyTitle>
                  <EmptyDescription>Try another model filter, lower the file count, or create a new build from the home page.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/" className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm transition hover:bg-accent">
                    Create build
                  </Link>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {communityBuilds.map((build) => (
                  <div key={build.id} className="group overflow-hidden rounded-xl border border-border/70 bg-card/50 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-ring/40 hover:bg-card hover:shadow-sm">
                    {build.shareMessageId ? (
                      <div className="relative aspect-[1200/630] border-b border-border/70 bg-muted/40">
                        <Image
                          src={buildOgImagePath({ prompt: build.title, messageId: build.shareMessageId })}
                          alt={`Preview card for ${build.title}`}
                          fill
                          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 45vw, 30vw"
                          loading="lazy"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <div className="truncate text-sm font-medium">{build.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {build.model} · {build.fileCount} files
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <a href={`/share/v2/${build.shareMessageId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
                          <ExternalLink className="size-3" aria-hidden="true" /> Live
                        </a>
                        <Link href={`/chats/${build.id}`} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
                          Open in builder
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
