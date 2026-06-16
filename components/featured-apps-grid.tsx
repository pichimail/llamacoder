import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import {
  FEATURED_APPS,
  featuredAppBuilderHref,
  featuredAppPath,
  type FeaturedApp,
} from "@/lib/featured-apps";
import { buildOgImagePath } from "@/lib/og-shared";

type FeaturedAppsGridProps = {
  apps?: FeaturedApp[];
  limit?: number;
  compact?: boolean;
};

export function FeaturedAppsGrid({
  apps = FEATURED_APPS,
  limit,
  compact = false,
}: FeaturedAppsGridProps) {
  const items = limit ? apps.slice(0, limit) : apps;

  return (
    <div
      className={
        compact
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {items.map((app) => (
        <article
          key={app.slug}
          className="group overflow-hidden rounded-xl border border-border/70 bg-card/50 transition hover:border-ring/40 hover:bg-card"
        >
          <Link href={featuredAppPath(app.slug)} className="block">
            <div className="relative aspect-[1200/630] border-b border-border/70 bg-muted/30">
              <Image
                src={buildOgImagePath({ prompt: app.title })}
                alt={`${app.title} preview card`}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                unoptimized
              />
            </div>
          </Link>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={featuredAppPath(app.slug)}
                  className="truncate text-sm font-medium text-foreground transition hover:text-foreground/80"
                >
                  {app.title}
                </Link>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {app.description}
                </p>
              </div>
              <Sparkles
                className="size-3.5 shrink-0 text-emerald-500/80"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Link
                href={featuredAppPath(app.slug)}
                className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                Open sandbox
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
              <Link
                href={featuredAppBuilderHref(app.prompt)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition hover:text-foreground"
              >
                Remix
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}