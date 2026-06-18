"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Brain, LayoutTemplate } from "lucide-react";

type BuilderTogglesProps = {
  shadcnEnabled: boolean;
  onShadcnChange: (value: boolean) => void;
  reasoningEnabled?: boolean;
  onReasoningChange?: (value: boolean) => void;
  showShadcn?: boolean;
  compact?: boolean;
  className?: string;
};

export function BuilderToggles({
  shadcnEnabled,
  onShadcnChange,
  reasoningEnabled = false,
  onReasoningChange,
  showShadcn = true,
  compact = false,
  className,
}: BuilderTogglesProps) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "" : "flex-wrap", className)}>
      {showShadcn ? (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <LayoutTemplate className="size-3.5" aria-hidden="true" />
          <span className={compact ? "sr-only sm:not-sr-only" : ""}>shadcn</span>
          <Switch
            checked={shadcnEnabled}
            onCheckedChange={onShadcnChange}
            aria-label="Toggle shadcn component library"
          />
        </label>
      ) : null}
      {onReasoningChange ? (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Brain className="size-3.5" aria-hidden="true" />
          <span className={compact ? "sr-only sm:not-sr-only" : ""}>Reasoning</span>
          <Switch
            checked={reasoningEnabled}
            onCheckedChange={onReasoningChange}
            aria-label="Toggle chain-of-thought reasoning"
          />
        </label>
      ) : null}
    </div>
  );
}
