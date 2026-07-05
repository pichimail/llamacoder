"use client";

/** Pricing plan configuration (admin): edit per-plan limits — allowed model
 * tiers, project caps, feature gates, and monthly credit grant — and persist
 * them live without a code deploy. */

import { useEffect, useState, useTransition } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DotFlow } from "@/components/ui/dot-flow";
import { toast } from "@/hooks/use-toast";

type Limits = {
  allowedTiers: string[];
  maxProjects: number;
  backendMode: boolean;
  customDomains: boolean;
  byok: boolean;
  monthlyGrant: number;
};
type PlanId = "free" | "pro" | "enterprise";
type Config = Record<PlanId, Limits>;

const PLAN_ORDER: PlanId[] = ["free", "pro", "enterprise"];

export default function AdminPricingPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [defaults, setDefaults] = useState<Config | null>(null);
  const [tiers, setTiers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/admin/plan-config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setConfig(data.config); setDefaults(data.defaults); setTiers(data.tiers); })
      .catch(() => toast({ title: "Could not load plan config" }));
  }, []);

  const update = (plan: PlanId, patch: Partial<Limits>) => {
    setConfig((prev) => (prev ? { ...prev, [plan]: { ...prev[plan], ...patch } } : prev));
  };

  const toggleTier = (plan: PlanId, tier: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const has = prev[plan].allowedTiers.includes(tier);
      const allowedTiers = has ? prev[plan].allowedTiers.filter((t) => t !== tier) : [...prev[plan].allowedTiers, tier];
      return { ...prev, [plan]: { ...prev[plan], allowedTiers } };
    });
  };

  const save = () => {
    if (!config) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/plan-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Save failed", description: data.error || "Check the values and retry." });
        return;
      }
      toast({ title: "Plan limits saved", description: "New limits apply immediately." });
    });
  };

  const resetToDefaults = () => {
    if (defaults) setConfig(structuredClone(defaults));
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Plan Limits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit what each plan can do. Changes apply immediately — no deploy required.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={!defaults || isPending}>
            <RotateCcw className="mr-2 size-4" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={!config || isPending}>
            {isPending ? <DotFlow size={5} className="mr-2" label="Saving" /> : <Save className="mr-2 size-4" />} Save
          </Button>
        </div>
      </div>

      {!config ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const limits = config[plan];
            return (
              <Card key={plan}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base capitalize">
                    {plan}
                    <Badge variant="secondary" className="rounded-full text-[10px]">{limits.monthlyGrant} credits/mo</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">Server-enforced limits for the {plan} plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monthly credit grant</Label>
                    <Input
                      type="number"
                      min={0}
                      value={limits.monthlyGrant}
                      onChange={(e) => update(plan, { monthlyGrant: Math.max(0, parseInt(e.target.value || "0", 10) || 0) })}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Max projects (-1 = unlimited)</Label>
                    <Input
                      type="number"
                      min={-1}
                      value={limits.maxProjects}
                      onChange={(e) => update(plan, { maxProjects: parseInt(e.target.value || "0", 10) })}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Allowed model tiers</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {tiers.map((tier) => {
                        const on = limits.allowedTiers.includes(tier);
                        const locked = tier === "free" || tier === "auto";
                        return (
                          <button
                            key={tier}
                            type="button"
                            disabled={locked}
                            onClick={() => toggleTier(plan, tier)}
                            className={`rounded-[6px] border px-2 py-1 text-xs capitalize transition-colors ${
                              on
                                ? "border-primary/40 bg-primary/15 text-foreground"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                            } ${locked ? "opacity-60" : ""}`}
                            title={locked ? "Always available" : undefined}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <FeatureToggle label="Backend mode" checked={limits.backendMode} onChange={(v) => update(plan, { backendMode: v })} />
                    <FeatureToggle label="Custom domains" checked={limits.customDomains} onChange={(v) => update(plan, { customDomains: v })} />
                    <FeatureToggle label="Bring your own key (BYOK)" checked={limits.byok} onChange={(v) => update(plan, { byok: v })} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeatureToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
