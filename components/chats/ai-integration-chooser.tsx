"use client";

/** AI Integration Chooser (Phase 3).
 * Non-blocking inline card shown in the chat stream BEFORE generation begins,
 * only when AI capabilities are detected in the prompt. */

import { useCallback, useEffect, useState, useTransition } from "react";
import { KeyRound, Loader2, Sparkles, SkipForward, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import type { AICapability } from "@/lib/ai-detection";

export type AIIntegrationChoice = "chinnallm" | "byok" | "skip";

const CAPABILITY_LABELS: Record<AICapability, string> = {
  text: "Text AI",
  vision: "Vision",
  image: "Image Gen",
  code: "Code AI",
  music: "Music Gen",
  video: "Video Gen",
};

const CAPABILITY_COLORS: Record<AICapability, string> = {
  text: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  vision: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  image: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  code: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  music: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  video: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

interface AIIntegrationChooserProps {
  chatId: string;
  capabilities: AICapability[];
  onSelect: (choice: AIIntegrationChoice) => void;
  onDismiss?: () => void;
}

export function AIIntegrationChooser({ chatId, capabilities, onSelect, onDismiss }: AIIntegrationChooserProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [showByokInput, setShowByokInput] = useState(false);
  const [byokKey, setByokKey] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chinnallm/credits", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data) { setBalance(data.balance ?? 0); } })
      .catch(() => { if (!cancelled) setBalance(0); });
    return () => { cancelled = true; };
  }, []);

  const patchChat = useCallback(async (choice: AIIntegrationChoice) => {
    await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiIntegration: choice }),
    }).catch(() => undefined);
  }, [chatId]);

  const handleSelect = (choice: AIIntegrationChoice) => {
    startTransition(async () => {
      await patchChat(choice);
      onSelect(choice);
    });
  };

  const handleByokSave = () => {
    const key = byokKey.trim();
    if (key.length < 8) {
      toast({ title: "Enter a valid API key", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/chinnallm/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", key, label: "Chat BYOK" }),
      }).catch(() => null);
      if (!response?.ok) {
        const data = await response?.json().catch(() => null);
        toast({ title: "Could not save key", description: data?.error || "Try again.", variant: "destructive" });
        return;
      }
      await patchChat("byok");
      onSelect("byok");
    });
  };

  return (
    <Card className="mx-auto w-full max-w-2xl rounded-2xl border-primary/20 bg-card/95 shadow-lg backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="size-5 text-primary" />
          AI Capabilities Detected
        </CardTitle>
        <CardDescription className="text-sm">
          Your app needs AI features. How would you like to power them?
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          {capabilities.map((cap) => (
            <Badge key={cap} variant="outline" className={`rounded-full border px-3 py-1 text-xs ${CAPABILITY_COLORS[cap]}`}>
              {CAPABILITY_LABELS[cap]}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {/* Option 1: ChinnaLLM */}
        <button
          type="button"
          onClick={() => handleSelect("chinnallm")}
          disabled={isPending}
          className="group w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">ChinnaLLM</span>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">Recommended</Badge>
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your credits •{" "}
                {balance === null
                  ? <Skeleton className="inline-block h-3 w-12 rounded" />
                  : <span className={balance > 50 ? "text-emerald-500" : balance > 10 ? "text-amber-500" : "text-red-500"}>{balance} credits remaining</span>
                }
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported: {capabilities.map((c) => CAPABILITY_LABELS[c]).join(", ")}
              </p>
            </div>
            {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
        </button>

        {/* Option 2: BYOK */}
        <div className={`rounded-xl border border-border/70 bg-muted/30 p-4 transition-all duration-200 ${showByokInput ? "ring-1 ring-primary/30" : ""}`}>
          <button
            type="button"
            onClick={() => { if (!showByokInput) setShowByokInput(true); }}
            disabled={isPending}
            className="group flex w-full items-start gap-3 text-left focus-visible:outline-none disabled:opacity-50"
          >
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <KeyRound className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground">Bring Your Own Key</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your own API key • No credit deduction • Full control
              </p>
            </div>
          </button>
          {showByokInput ? (
            <div className="mt-3 grid gap-3 pl-12">
              <div className="grid gap-2">
                <Label htmlFor="byok-inline-key" className="text-xs">API Key</Label>
                <Input
                  id="byok-inline-key"
                  type="password"
                  value={byokKey}
                  onChange={(event) => setByokKey(event.target.value)}
                  placeholder="sk-..."
                  autoFocus
                  autoComplete="off"
                  className="h-10 rounded-lg"
                />
              </div>
              <Button onClick={handleByokSave} disabled={isPending || byokKey.trim().length < 8} size="sm" className="min-h-[40px] w-full rounded-lg sm:w-auto">
                {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save & continue
              </Button>
            </div>
          ) : null}
        </div>

        {/* Option 3: Skip */}
        <button
          type="button"
          onClick={() => handleSelect("skip")}
          disabled={isPending}
          className="group w-full rounded-xl border border-border/50 bg-transparent p-4 text-left transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <SkipForward className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground">Skip for now</span>
              <p className="mt-1 text-xs text-muted-foreground">
                AI features will be stubbed with TODO comments. You can add AI later.
              </p>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
