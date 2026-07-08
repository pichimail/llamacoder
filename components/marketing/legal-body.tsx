import type { ReactNode } from "react";

/**
 * Consistent prose styling for legal / policy pages rendered inside the
 * aurora MarketingShell. Uses light-on-dark typography tuned for readability.
 */
export function LegalBody({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-10">
      <div
        className="
          space-y-4 text-sm leading-relaxed text-white/70
          [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white
          [&_h2:first-child]:mt-0
          [&_p]:text-white/70
          [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ul]:text-white/70
          [&_a]:text-emerald-400 [&_a]:underline [&_strong]:text-white
        "
      >
        {children}
      </div>
    </div>
  );
}
