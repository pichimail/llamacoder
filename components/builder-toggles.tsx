"use client";

import { Switch } from "@/components/ui/switch";
import { Brain, LayoutTemplate } from "lucide-react";

type BuilderTogglesProps = {
  shadcnEnabled: boolean;
  onShadcnChange: (value: boolean) => void;
  reasoningEnabled?: boolean;
  onReasoningChange?: (value: boolean) => void;
  compact?: boolean;
};

export function BuilderToggles({
  shadcnEnabled,
  onShadcnChange,
  reasoningEnabled = false,
  onReasoningChange,
  compact = false,
}: BuilderTogglesProps) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "flex-wrap"}`}>
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <LayoutTemplate className="size-3.5" aria-hidden="true" />
        <span className={compact ? "sr-only sm:not-sr-only" : ""}>shadcn</span>
        <Switch
          checked={shadcnEnabled}
          onCheckedChange={onShadcnChange}
          aria-label="Toggle shadcn component library"
        />
      </label>
      {onReasoningChange ? (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
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