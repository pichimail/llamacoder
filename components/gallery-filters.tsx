"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SOURCES = [
  { value: "all", label: "All" },
  { value: "featured", label: "Featured" },
  { value: "motion", label: "Motion" },
  { value: "templates", label: "Templates" },
  { value: "community", label: "Community" },
] as const;

const MODELS = ["", "glm", "qwen", "minimax", "deepseek", "claude", "llama"];

export function GalleryFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "all";
  const model = searchParams.get("model") || "";
  const minFiles = searchParams.get("minFiles") || "";

  const makeHref = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Source</span>
      {SOURCES.map((item) => (
        <Link
          key={item.value}
          href={makeHref({ source: item.value === "all" ? undefined : item.value })}
          className={`rounded-md border px-2.5 py-1 transition ${
            source === item.value
              ? "border-foreground/30 bg-accent text-foreground"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}

      <span className="ml-2 text-muted-foreground">Model</span>
      <select
        value={model}
        onChange={(event) => {
          window.location.href = makeHref({
            model: event.target.value || undefined,
          });
        }}
        className="rounded-md border border-border/70 bg-background px-2 py-1 text-xs"
        aria-label="Filter by model"
      >
        {MODELS.map((item) => (
          <option key={item || "all"} value={item}>
            {item ? item.toUpperCase() : "Any model"}
          </option>
        ))}
      </select>

      <span className="ml-2 text-muted-foreground">Min files</span>
      {[0, 1, 3, 5].map((count) => (
        <Link
          key={count}
          href={makeHref({ minFiles: count ? String(count) : undefined })}
          className={`rounded-md border px-2.5 py-1 transition ${
            (minFiles ? Number(minFiles) : 0) === count
              ? "border-foreground/30 bg-accent text-foreground"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          {count === 0 ? "Any" : `${count}+`}
        </Link>
      ))}
    </div>
  );
}