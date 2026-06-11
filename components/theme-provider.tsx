"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved =
    theme === "system" ? getSystemTheme() : theme;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const systemIsDark = useMediaQuery("(prefers-color-scheme: dark)");

  // Initialize from storage on mount (client only)
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);

    const resolved = stored === "system" ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
    applyTheme(stored);
  }, []);

  // React to system changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const newResolved = systemIsDark ? "dark" : "light";
    setResolvedTheme(newResolved);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newResolved);
  }, [systemIsDark, theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem("theme", newTheme);
    } catch {}

    const resolved =
      newTheme === "system" ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    // Cycle: light -> dark -> system -> light
    // Or simpler common: just toggle between light/dark, preserving system intent by setting explicit
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      // from system: go to explicit opposite of current resolved
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During SSR or if not wrapped, return safe defaults
    return {
      theme: "system" as Theme,
      resolvedTheme: "light" as const,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
