"use client";

/** Live build-activity strip: dotted loader + shimmering stage word.
 * The stage word is driven by a real interval ticker (state), unlike the
 * previous render-time `Date.now()` trick which only changed when something
 * else happened to re-render — so the strip stays alive even when the rest
 * of the page is idle waiting on the stream. */

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { DotFlow } from "@/components/ui/dot-flow";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

const BUILD_WORDS = [
  "Scaffolding",
  "Architecting",
  "Composing",
  "Wiring",
  "Styling",
  "Refining",
  "Polishing",
  "Validating",
  "Optimizing",
  "Assembling",
];

export function useBuildWordTicker(active: boolean, intervalMs = 2400) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % BUILD_WORDS.length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return BUILD_WORDS[index];
}

export function BuildActivityStrip({
  active,
  phase = "building",
  className,
}: {
  active: boolean;
  /** "reasoning" shows a thinking label instead of cycling build words. */
  phase?: "building" | "reasoning";
  className?: string;
}) {
  const word = useBuildWordTicker(active && phase === "building");
  if (!active) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-1.5 text-xs backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {phase === "reasoning" ? (
        <Brain className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <span className="inline-flex shrink-0"><DotFlow size={4} /></span>
      )}
      <Shimmer as="span" duration={1.6} className="text-xs font-medium">
        {phase === "reasoning" ? "Reasoning through the build…" : `${word} the artifact…`}
      </Shimmer>
    </div>
  );
}
