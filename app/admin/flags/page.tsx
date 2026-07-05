"use client";

/** Feature flags admin (Phase 4): every P1–P4 feature grouped by category
 * with live Switch toggles. Changes take effect on next page load. */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ToggleLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Flag = {
  key: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
  updatedAt: string | null;
};

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  builder: { title: "Builder", description: "Prompt composer and generation features (Phase 1)" },
  ai: { title: "AI Engine", description: "ChinnaLLM, credits, and BYOK (Phases 2–3)" },
  chat: { title: "Chat Workspace", description: "In-chat tooling" },
  platform: { title: "Platform", description: "Site-wide surfaces" },
};

const CATEGORY_ORDER = ["builder", "ai", "chat", "platform"];

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const response = await fetch("/api/admin/feature-flags", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) setFlags(Array.isArray(data?.flags) ? data.flags : []);
    else {
      setFlags([]);
      toast({ title: "Could not load flags", description: "Check admin access and that migrations have run.", variant: "destructive" });
    }
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleFlag = async (flag: Flag) => {
    setPendingKey(flag.key);
    // Optimistic update
    setFlags((items) => (items ?? []).map((f) => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f)));
    const response = await fetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
    }).catch(() => null);
    if (!response?.ok) {
      // Roll back
      setFlags((items) => (items ?? []).map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f)));
      toast({ title: "Toggle failed", description: "The flag was not saved.", variant: "destructive" });
    } else {
      toast({ title: `${flag.label} ${!flag.enabled ? "enabled" : "disabled"}` });
    }
    setPendingKey(null);
  };

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    meta: CATEGORY_META[category] ?? { title: category, description: "" },
    items: (flags ?? []).filter((flag) => flag.category === category),
  })).filter((group) => flags === null || group.items.length > 0);

  const enabledCount = (flags ?? []).filter((flag) => flag.enabled).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ToggleLeft className="size-6 text-primary" /> Feature Flags
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn any platform feature on or off dynamically. {flags ? `${enabledCount}/${flags.length} enabled.` : ""}
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-10 rounded-lg" onClick={() => void load()} disabled={refreshing} aria-label="Refresh flags">
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      {flags === null ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-48 w-full rounded-xl" />)}</div>
      ) : (
        grouped.map((group) => (
          <Card key={group.category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group.meta.title}</CardTitle>
              <CardDescription className="text-xs">{group.meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              {group.items.map((flag) => (
                <div key={flag.key} className="flex min-h-[44px] items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{flag.label}</p>
                      <Badge variant="outline" className="rounded-full font-mono text-[9px] text-muted-foreground">{flag.key}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    disabled={pendingKey === flag.key}
                    onCheckedChange={() => void toggleFlag(flag)}
                    aria-label={`Toggle ${flag.label}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
