"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { ReactNode } from "react";

export type Theme = "light" | "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const resolved = (resolvedTheme ?? theme ?? "light") as Theme;

  return {
    theme: theme === "system" || !theme ? resolved : (theme as Theme),
    resolvedTheme: resolved,
    setTheme: (nextTheme: Theme) => setTheme(nextTheme),
    toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
  };
}