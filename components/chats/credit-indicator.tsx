"use client";

/** Credit indicator pill (Phase 3).
 * Shows in the chat header when aiIntegration === "chinnallm".
 * Color-coded: green >50, amber 10-50, red <10, pulsing red 0. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditIndicatorProps {
  /** Only render when the chat uses ChinnaLLM credits. */
  visible?: boolean;
  className?: string;
}

export function CreditIndicator({ visible = false, className }: CreditIndicatorProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState("free");
  const [totalGranted, setTotalGranted] = useState(100);
  const [resetDate, setResetDate] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/chinnallm/credits", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setBalance(data.balance ?? 0);
        setPlanTier(data.planTier ?? "free");
        setTotalGranted(data.totalGranted ?? 100);
        if (data.monthlyResetAt) {
          const reset = new Date(data.monthlyResetAt);
          reset.setDate(reset.getDate() + 30);
          setResetDate(reset.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
        }
      } catch {}
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [visible]);

  if (!visible) return null;

  const colorClass =
    balance === null ? "text-muted-foreground"
    : balance === 0 ? "text-red-500 animate-pulse"
    : balance < 10 ? "text-red-500"
    : balance <= 50 ? "text-amber-500"
    : "text-emerald-500";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
          aria-label="ChinnaLLM credit balance"
        >
          <Sparkles className={`size-3.5 ${colorClass}`} />
          {balance === null ? (
            <Skeleton className="h-3 w-8 rounded" />
          ) : (
            <span className={colorClass}>{balance} credits</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-xl p-4" sideOffset={8}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">ChinnaLLM credits</span>
            <Badge variant="secondary" className="rounded-full capitalize">{planTier}</Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>{balance ?? "—"}</span>
            <span className="text-xs text-muted-foreground">/ {totalGranted}</span>
          </div>
          {resetDate ? (
            <p className="text-xs text-muted-foreground">Resets: {resetDate}</p>
          ) : null}
          <div className="flex flex-col gap-2 pt-1">
            <Button asChild size="sm" variant="outline" className="w-full rounded-lg">
              <Link href="/credits">Manage credits</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full rounded-lg">
              <Link href="/credits#byok">Add BYOK key</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
