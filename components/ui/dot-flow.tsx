"use client";

/**
 * DotFlow — a lightweight animated "flowing dots" loader.
 *
 * Local, dependency-free replacement for the never-installed `@pacekit/dot-flow`
 * package. Used for the composer send state and full-page loading states in
 * place of the lucide `Loader2` spinner. Animation is pure CSS keyframes so it
 * works in server components' client children and Sandpack previews alike.
 */
import { cn } from "@/lib/utils";

export type DotFlowProps = {
  /** Diameter of each dot in pixels. Defaults to 6. */
  size?: number;
  /** Number of dots. Defaults to 3. */
  count?: number;
  /** Optional accessible label (announced to screen readers). */
  label?: string;
  className?: string;
  /** Tailwind text-color class controls the dot color via currentColor. */
  color?: string;
};

export function DotFlow({
  size = 6,
  count = 3,
  label = "Loading",
  className,
  color = "text-current",
}: DotFlowProps) {
  const dots = Array.from({ length: Math.max(1, count) });
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center", color, className)}
      style={{ gap: Math.max(2, Math.round(size * 0.55)) }}
    >
      {dots.map((_, i) => (
        <span
          key={i}
          className="dot-flow-dot inline-block rounded-full bg-current"
          style={{
            width: size,
            height: size,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <span className="sr-only">{label}…</span>
      <style>{`
        @keyframes dot-flow-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-45%); opacity: 1; }
        }
        .dot-flow-dot {
          animation: dot-flow-bounce 1s ease-in-out infinite both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-flow-dot { animation-duration: 2s; }
        }
      `}</style>
    </span>
  );
}

export default DotFlow;
