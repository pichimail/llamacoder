"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PromptRewriteButtonProps = {
  prompt: string;
  mode?: "ask" | "plan" | "agent";
  model?: string;
  onRewrite: (next: string) => void;
  disabled?: boolean;
  className?: string;
};

export function PromptRewriteButton({
  prompt,
  mode = "agent",
  model,
  onRewrite,
  disabled,
  className = "inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40",
}: PromptRewriteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRewrite = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rewrite-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, mode, model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Rewrite failed",
          description: data?.error || "Could not enhance prompt",
          variant: "destructive",
        });
        return;
      }
      const next = String(data.prompt || "").trim();
      if (next) {
        onRewrite(next);
        toast({ title: "Prompt enhanced", description: "Review the rewritten prompt before sending." });
      }
    } catch {
      toast({ title: "Rewrite failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRewrite}
      disabled={disabled || loading || !prompt.trim()}
      className={className}
      aria-label="Enhance prompt with AI"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="size-3.5" aria-hidden="true" />
      )}
      Enhance
    </button>
  );
}