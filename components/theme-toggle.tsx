"use client";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { memo, useEffect, useState } from "react";

function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;
  const Icon = isDark ? Sun : Moon;
  const label = mounted ? (isDark ? "Dark" : "Light") : "Theme";

  if (mounted && isDark) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Switch to light mode"
        aria-pressed="true"
        title={mounted ? `Theme: ${label}. Click to change` : "Theme"}
        className={cn(
          "hs-theme-toggle group relative inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 text-white/90 shadow-sm shadow-black/20 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/[0.18] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.985]",
          !showLabel && "size-9 px-0",
          className,
        )}
      >
        <Icon className="size-[18px] stroke-[1.85] transition-all duration-200 ease-out group-active:scale-90" strokeWidth={2.25} aria-hidden="true" />
        {showLabel ? (
          <span className="truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
            {label} mode
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={mounted ? toggleTheme : undefined}
      aria-label={mounted ? "Switch to dark mode" : "Toggle theme"}
      aria-pressed="false"
      title={mounted ? `Theme: ${label}. Click to change` : "Theme"}
      className={cn(
        "hs-theme-toggle group relative inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#fffaf2] px-2.5 text-stone-800 shadow-sm shadow-stone-950/10 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-stone-100 hover:text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.985] dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:shadow-black/20 dark:hover:bg-white/[0.18] dark:hover:text-white",
        !showLabel && "size-9 px-0",
        className,
      )}
    >
      {mounted ? (
        <Icon className="size-[18px] stroke-[1.85] transition-all duration-200 ease-out group-active:scale-90" strokeWidth={2.25} aria-hidden="true" />
      ) : (
        <span className="size-[18px]" aria-hidden="true" />
      )}
      {showLabel ? (
        <span className="truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
          {label} mode
        </span>
      ) : null}
    </button>
  );
}

export default memo(ThemeToggle);
