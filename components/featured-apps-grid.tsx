"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Hammer, Pin, Sparkles } from "lucide-react";

import { FeaturedSandboxThumb } from "@/components/featured-sandbox-thumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FEATURED_APPS,
  featuredAppBuilderHref,
  featuredAppPath,
  type FeaturedApp,
} from "@/lib/featured-apps";
import { cn } from "@/lib/utils";

type FeaturedAppsGridProps = {
  apps?: FeaturedApp[];
  limit?: number;
  compact?: boolean;
  liveThumbs?: boolean;
};

export function FeaturedAppsGrid({
  apps = FEATURED_APPS,
  limit,
  compact = false,
  liveThumbs = true,
}: FeaturedAppsGridProps) {
  const router = useRouter();
  const [selectedApp, setSelectedApp] = useState<FeaturedApp | null>(null);
  const items = limit ? apps.slice(0, limit) : apps;

  const previewHref = useMemo(
    () => (selectedApp ? featuredAppPath(selectedApp.slug) : "#"),
    [selectedApp],
  );

  return (
    <>
      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {items.map((app) => (
          <button
            key={app.slug}
            type="button"
            onClick={() => setSelectedApp(app)}
            className={cn(
              "group overflow-hidden rounded-[28px] border border-border/70 bg-card/50 text-left transition",
              "hover:border-ring/40 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <div className="relative aspect-[1200/630] overflow-hidden border-b border-border/70 bg-muted/30">
              <FeaturedSandboxThumb slug={app.slug} title={app.title} live={liveThumbs} />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground transition group-hover:text-foreground/80">
                    {app.title}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {app.description}
                  </p>
                </div>
                {app.pinned ? (
                  <Pin className="size-3.5 shrink-0 text-amber-500/90" aria-hidden="true" />
                ) : (
                  <Sparkles
                    className="size-3.5 shrink-0 text-emerald-500/80"
                    aria-hidden="true"
                  />
                )}
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
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-muted-foreground transition group-hover:bg-accent group-hover:text-foreground">
                  Open preview
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition group-hover:text-foreground">
                  Remix
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={selectedApp !== null} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,1200px)] overflow-hidden rounded-[32px] border-border/70 bg-background p-0">
          {selectedApp ? (
            <div className="grid max-h-[90vh] gap-0 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-border/70 bg-card/50 lg:border-b-0 lg:border-r">
                <div className="relative aspect-[1200/900] min-h-[320px] overflow-hidden">
                  <FeaturedSandboxThumb
                    slug={selectedApp.slug}
                    title={selectedApp.title}
                    live={liveThumbs}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
                <DialogHeader className="space-y-3 text-left">
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    {selectedApp.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                    {selectedApp.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Remix prompt
                    </div>
                    <p className="rounded-2xl border border-border/70 bg-card/40 p-4 text-sm leading-relaxed text-foreground">
                      {selectedApp.prompt}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedApp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Link
                    href={previewHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    <ExternalLink className="size-4" />
                    Open preview
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(featuredAppBuilderHref(selectedApp.prompt));
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
                  >
                    <Hammer className="size-4" />
                    Remix in builder
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
