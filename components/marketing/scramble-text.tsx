"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>_-=+*";

type ScrambleTextProps = {
  text: string;
  className?: string;
  /** Duration of the scramble animation in ms. */
  duration?: number;
  /** When true, scrambles once on mount as it enters the viewport. */
  scrambleOnView?: boolean;
  as?: "span" | "div" | "p";
};

/**
 * Hover (and optional on-view) scramble text effect. Each character is briefly
 * replaced with random glyphs before resolving to the final character, moving
 * left-to-right. Respects prefers-reduced-motion.
 */
export function ScrambleText({
  text,
  className,
  duration = 620,
  scrambleOnView = false,
  as = "span",
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const frame = useRef<number | null>(null);
  const startTime = useRef(0);
  const ref = useRef<HTMLElement | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setDisplay(text);
  }, [text]);

  const run = useCallback(() => {
    if (reducedMotion.current) {
      setDisplay(text);
      return;
    }
    if (frame.current) cancelAnimationFrame(frame.current);
    startTime.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const revealed = Math.floor(progress * text.length);
      let next = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") {
          next += text[i];
        } else {
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setDisplay(next);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [text, duration]);

  useEffect(() => {
    if (!scrambleOnView || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrambleOnView, run]);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const Tag = as as "span";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={className}
      onMouseEnter={run}
      data-scramble
    >
      {display}
    </Tag>
  );
}
