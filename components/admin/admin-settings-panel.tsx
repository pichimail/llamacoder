"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type SettingKey = "saasMode" | "googleAuth" | "gallery" | "autoFixDefault";
type SettingValue = "on" | "off";
type SettingsMap = Record<SettingKey, SettingValue>;

const SETTING_META: Array<{
  key: SettingKey;
  title: string;
  description: string;
}> = [
  {
    key: "saasMode",
    title: "SaaS mode",
    description: "Requires sign-in and moves the app toward account-scoped usage.",
  },
  {
    key: "googleAuth",
    title: "Google sign-in",
    description: "Shows Google OAuth entry points when OAuth env vars are present.",
  },
  {
    key: "gallery",
    title: "Gallery",
    description: "Controls the public gallery and community build discovery pages.",
  },
  {
    key: "autoFixDefault",
    title: "Auto-fix",
    description: "Enables the default repair loop for preview/runtime validation issues.",
  },
];

export function AdminSettingsPanel({ settings }: { settings: SettingsMap }) {
  const [values, setValues] = useState<SettingsMap>(settings);
  const [pendingKey, setPendingKey] = useState<SettingKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateSetting = (key: SettingKey, checked: boolean) => {
    const nextValue: SettingValue = checked ? "on" : "off";
    const previous = values[key];
    setValues((current) => ({ ...current, [key]: nextValue }));
    setPendingKey(key);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: nextValue }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "Could not update setting");
        setValues(body as SettingsMap);
        toast({ title: "Setting updated", description: `${key} is now ${nextValue}.` });
      } catch (error) {
        setValues((current) => ({ ...current, [key]: previous }));
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Could not update setting.",
          variant: "destructive",
        });
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          Feature flags
          {isPending ? <RefreshCw className="size-4 animate-spin text-muted-foreground" /> : null}
        </CardTitle>
        <CardDescription>Production controls backed by the admin settings API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SETTING_META.map((item) => {
          const checked = values[item.key] === "on";
          const disabled = pendingKey === item.key || isPending;
          return (
            <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.title}</span>
                  <Badge variant={checked ? "default" : "outline"}>{checked ? "On" : "Off"}</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
              <Switch checked={checked} disabled={disabled} onCheckedChange={(next) => updateSetting(item.key, next)} aria-label={`Toggle ${item.title}`} />
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          Refresh admin data
        </Button>
      </CardContent>
    </Card>
  );
}
