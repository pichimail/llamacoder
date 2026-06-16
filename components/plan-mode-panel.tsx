"use client";

import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { extractAllCodeBlocks } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

const PLAN_SECTIONS = [
  "App Summary",
  "Visual Fidelity Goals",
  "Core Features & Backend",
  "File Structure",
  "Tech Decisions",
  "Next Step",
] as const;

export function PlanModePanel({ className }: { className?: string }) {
  return (
    <Plan defaultOpen className={cn("border-border/70 bg-card/80", className)}>
      <PlanHeader className="flex-row items-start gap-3 space-y-0 p-4 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <PlanTitle className="text-base font-semibold">Plan mode</PlanTitle>
          <PlanDescription>
            Outline scope, visuals, features, and file structure before generating code.
          </PlanDescription>
        </div>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent className="px-4 pb-4 pt-0">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          {PLAN_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ol>
      </PlanContent>
    </Plan>
  );
}

export function extractPlanTitle(content: string) {
  const summary = content.match(/\*\*1\.\s*App Summary\*\*\s*\n+([^\n*]+)/i);
  if (summary?.[1]?.trim()) return summary[1].trim().slice(0, 96);
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("**") && !line.startsWith("#"));
  if (firstLine) return firstLine.slice(0, 96);
  return "Implementation plan";
}

export function isPlanResponse(content: string) {
  if (!content.trim()) return false;
  if (extractAllCodeBlocks(content).length > 0) return false;
  return (
    /\*\*\d+\.\s/.test(content) ||
    /App Summary|Visual Fidelity|File Structure|Next Step/i.test(content)
  );
}

type PlanResponseCardProps = {
  content: string;
  isStreaming?: boolean;
  className?: string;
};

export function PlanResponseCard({
  content,
  isStreaming = false,
  className,
}: PlanResponseCardProps) {
  const title = extractPlanTitle(content);

  return (
    <Plan
      defaultOpen
      isStreaming={isStreaming}
      className={cn("border-border/70 bg-card/80", className)}
    >
      <PlanHeader className="flex-row items-start gap-3 space-y-0 p-4 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <PlanTitle className="text-base font-semibold">{title}</PlanTitle>
          <PlanDescription>
            Review the outline, then switch to Agent mode when you are ready to build.
          </PlanDescription>
        </div>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent className="px-4 pb-4 pt-0">
        <div className="typography typography-sm max-w-none text-foreground/90">
          <Streamdown>{content}</Streamdown>
        </div>
      </PlanContent>
    </Plan>
  );
}