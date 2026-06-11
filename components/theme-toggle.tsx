"use client";

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { memo } from "react";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
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
      className="group relative inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.985] dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
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
