"use client";

import { useEffect, useState } from "react";
import { getVisibleModels } from "@/lib/constants";

export type AvailableModel = {
  label: string;
  value: string;
  provider: string;
  available: boolean;
  status: string;
  description: string;
};

export function useAvailableModels() {
  const [models, setModels] = useState<AvailableModel[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setModels(data.models ?? []);
          return;
        }
      } catch {
        // fall through to defaults
      }
      if (!cancelled) {
        setModels(
          getVisibleModels().map((model) => ({
            label: model.label,
            value: model.value,
            provider: model.provider,
            available: true,
            status: model.status || "ready",
            description: model.description || "",
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return models;
}