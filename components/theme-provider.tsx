"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: Theme;
  setTheme: (nextTheme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    const initialPreference: ThemePreference =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "system";

    const initialResolved =
      initialPreference === "system" ? getSystemTheme() : initialPreference;

    setThemePreference(initialPreference);
    setResolvedTheme(initialResolved);
    applyThemeToDocument(initialResolved);
  }, []);

  useEffect(() => {
    if (themePreference !== "system") {
      setResolvedTheme(themePreference);
      applyThemeToDocument(themePreference);
      return;
    }

    const currentSystemTheme = getSystemTheme();
    setResolvedTheme(currentSystemTheme);
    applyThemeToDocument(currentSystemTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      const nextResolved = event.matches ? "dark" : "light";
      setResolvedTheme(nextResolved);
      applyThemeToDocument(nextResolved);
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", onSystemThemeChange);
    };
  }, [themePreference]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme: themePreference,
      resolvedTheme,
      setTheme: (nextTheme: Theme) => {
        setThemePreference(nextTheme);
        setResolvedTheme(nextTheme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyThemeToDocument(nextTheme);
      },
      toggleTheme: () => {
        const currentResolved =
          themePreference === "system" ? getSystemTheme() : resolvedTheme;
        const nextTheme: Theme = currentResolved === "dark" ? "light" : "dark";
        setThemePreference(nextTheme);
        setResolvedTheme(nextTheme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyThemeToDocument(nextTheme);
      },
    };
  }, [resolvedTheme, themePreference]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  const resolved = context.resolvedTheme;

  return {
    theme: context.theme === "system" ? resolved : context.theme,
    resolvedTheme: resolved,
    setTheme: (nextTheme: Theme) => context.setTheme(nextTheme),
    toggleTheme: context.toggleTheme,
  };
}