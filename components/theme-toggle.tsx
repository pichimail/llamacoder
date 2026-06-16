"use client";

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { memo, useEffect, useState } from "react";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        aria-pressed={false}
        title="Theme"
        className="group relative inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.985]"
      >
        <span className="size-[18px]" aria-hidden="true" />
      </button>
    );
  }

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Dark" : "Light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      title={`Theme: ${label}. Click to change`}
      className="group relative inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.985]"
    >
      <Icon
        className="size-[18px] transition-all group-active:scale-90"
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </button>
  );
}

export default memo(ThemeToggle);
