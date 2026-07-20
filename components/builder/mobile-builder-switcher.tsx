"use client";

import { Code2, Eye, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobilePanel = "chat" | "code" | "preview";

const OPTIONS: { panel: MobilePanel; label: string; icon: typeof MessageSquare }[] = [
  { panel: "chat", label: "Chat", icon: MessageSquare },
  { panel: "code", label: "Code", icon: Code2 },
  { panel: "preview", label: "Preview", icon: Eye },
];

/**
 * Sticky mobile segmented control for switching between the Chat/Code/Preview
 * panels. Purely presentational — wired to the existing `mobilePanel` state
 * and `switchMobilePanel` handler in page.client.tsx, which already knows how
 * to keep builderMode in sync (it calls setModeSafely under the hood).
 */
export function MobileBuilderSwitcher({
  current,
  onChange,
  className,
}: {
  current: MobilePanel;
  onChange: (panel: MobilePanel) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Builder panel"
      className={cn(
        "sticky top-0 z-20 flex w-full items-center gap-1 overflow-x-auto border-b border-border/70 bg-background/95 px-2 py-1.5 backdrop-blur",
        "pt-[max(0.375rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      {OPTIONS.map(({ panel, label, icon: Icon }) => {
        const active = current === panel;
        return (
          <button
            key={panel}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(panel)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
