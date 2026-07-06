"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Loader2, Save, Settings2, ShieldCheck, Sparkles, ToggleLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type AdminSettings = {
  saasMode: "on" | "off";
  googleAuth: "on" | "off";
  gallery: "on" | "off";
  autoFixDefault: "on" | "off";
};

const SETTINGS: Array<{
  key: keyof AdminSettings;
  title: string;
  description: string;
  risk: string;
}> = [
  {
    key: "saasMode",
    title: "SaaS mode",
    description: "Require authenticated accounts before protected app, project, and admin workflows run.",
    risk: "Security gate",
  },
  {
    key: "googleAuth",
    title: "Google authentication",
    description: "Enable Google OAuth as the active login provider when the required secrets are configured.",
    risk: "Auth provider",
  },
  {
    key: "gallery",
    title: "Public gallery",
    description: "Allow public gallery surfaces to show curated and shareable generated apps.",
    risk: "Content surface",
  },
  {
    key: "autoFixDefault",
    title: "Auto-fix default",
    description: "Make preview repair available by default while still letting users dismiss or handle manually.",
    risk: "Generation control",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [dirty, setDirty] = useState<Partial<AdminSettings>>({});
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) {
          setSettings({
            saasMode: json.saasMode ?? "off",
            googleAuth: json.googleAuth ?? "off",
            gallery: json.gallery ?? "on",
            autoFixDefault: json.autoFixDefault ?? "on",
          });
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  const activeSettings = useMemo(() => ({ ...(settings || {}), ...dirty } as AdminSettings), [dirty, settings]);
  const dirtyCount = Object.keys(dirty).length;

  function update(key: keyof AdminSettings, enabled: boolean) {
    setDirty((current) => ({ ...current, [key]: enabled ? "on" : "off" }));
  }

  function save() {
    if (!settings || dirtyCount === 0) return;
    startTransition(async () => {
      try {
        let latest: AdminSettings = settings;
        for (const [key, value] of Object.entries(dirty) as Array<[keyof AdminSettings, "on" | "off"]>) {
          const response = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
          });
          const json = await response.json().catch(() => null);
          if (!response.ok) throw new Error(json?.error || `Could not save ${key}`);
          latest = {
            saasMode: json.saasMode ?? latest.saasMode,
            googleAuth: json.googleAuth ?? latest.googleAuth,
            gallery: json.gallery ?? latest.gallery,
            autoFixDefault: json.autoFixDefault ?? latest.autoFixDefault,
          };
        }
        setSettings(latest);
        setDirty({});
        toast({ title: "Admin settings saved", description: "The live platform settings were updated." });
      } catch (error) {
        toast({ title: "Could not save settings", description: error instanceof Error ? error.message : "Unknown error.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Settings2 className="size-3.5" /> Live configuration
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Control application-wide behavior through the backend settings route with audit logging.</p>
        </div>
        <Button onClick={save} disabled={!settings || dirtyCount === 0 || isPending} className="rounded-xl">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` : "Saved"}
        </Button>
      </div>

      {failed ? (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">Could not load settings. Check admin access and the Settings table.</CardContent></Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Platform switches</CardTitle>
            <CardDescription>These switches write to `/api/admin/settings` and are consumed by auth, gallery, and preview repair flows.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            {!settings ? (
              <div className="space-y-3 py-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
            ) : SETTINGS.map((item) => (
              <div key={item.key} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={`setting-${item.key}`} className="text-base font-medium">{item.title}</Label>
                    <Badge variant="outline" className="rounded-full">{item.risk}</Badge>
                    {dirty[item.key] ? <Badge variant="secondary" className="rounded-full">Unsaved</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
                <Switch id={`setting-${item.key}`} checked={activeSettings[item.key] === "on"} onCheckedChange={(checked) => update(item.key, checked)} aria-label={item.title} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" />Operational notes</CardTitle>
              <CardDescription>Safe places to continue configuration.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-between rounded-xl">
                <Link href="/admin/flags">Feature flags <ArrowUpRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="justify-between rounded-xl">
                <Link href="/admin/pricing">Plans and credits <ArrowUpRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="justify-between rounded-xl">
                <Link href="/admin/chinnallm">Model routing <ArrowUpRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-2 text-primary"><Sparkles className="size-4" /></div>
                <div>
                  <p className="font-medium">Responsive everywhere</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">The settings cards collapse into single-column controls on mobile and preserve full descriptions for keyboard and screen-reader users.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-border bg-muted p-2 text-muted-foreground"><ToggleLeft className="size-4" /></div>
                <div>
                  <p className="font-medium">Current state</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {settings ? `${Object.values(activeSettings).filter((value) => value === "on").length} of ${SETTINGS.length} switches enabled` : "Loading switches"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
