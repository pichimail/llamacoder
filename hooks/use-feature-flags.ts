"use client";

/** Client hook for feature flags (Phase 4). Defaults everything to enabled
 * until the fetch resolves so gated UI never flashes off for enabled flags. */
import { useEffect, useState } from "react";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feature-flags", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.flags) setFlags(data.flags);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const isEnabled = (key: string) => flags[key] !== false;
  return { flags, isEnabled, loaded };
}
