"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";
import { memo } from "react";

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    // Nice cycle: light -> dark -> system
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      // system -> explicit of the opposite of current resolved for quick "invert"
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  // Show the icon representing the *current effective* mode
  // When system, show a subtle monitor icon or resolved one with indicator
  const Icon = resolvedTheme === "dark" ? Sun : Moon;

  const label =
    theme === "system"
      ? `System (${resolvedTheme})`
      : theme === "dark"
        ? "Dark"
        : "Light";

  const ariaLabel = `Switch theme (current: ${label}). Click to cycle light / dark / system.`;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      aria-pressed={theme !== "system"}
      title={`Theme: ${label}. Click to change`}
      className="group inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.985] dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
    >
      <Icon
        className="size-[18px] transition-all group-active:scale-90"
        strokeWidth={2.25}
        aria-hidden="true"
      />
      {/* Small system indicator dot when using system preference */}
      {theme === "system" && (
        <Monitor
          className="absolute -bottom-0.5 -right-0.5 size-2.5 opacity-60"
          strokeWidth={3}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export default memo(ThemeToggle);
