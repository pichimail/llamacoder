"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Database, KeyRound, Link2, Server, Settings, Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type SettingsPayload = {
  defaultModel: string;
  defaultMode: "ask" | "plan" | "agent";
  promptStyle: string;
  aiKeys: Record<string, { configured?: boolean; masked?: string }>;
  database: { provider?: string; configured?: boolean; masked?: string };
  mcpServers: { id: string; name: string; url: string; token?: string; enabled: boolean }[];
  connectors: { id: string; name: string; type: "webhook" | "database" | "api" | "mcp"; endpoint: string; token?: string; enabled: boolean }[];
  artifactPrefs: { shadcn: boolean; accessibility: boolean; responsive: boolean; strictBackend: boolean };
};

const defaultPayload: SettingsPayload = {
  defaultModel: "zai-org/GLM-5",
  defaultMode: "agent",
  promptStyle: "premium-production",
  aiKeys: {},
  database: {},
  mcpServers: [],
  connectors: [],
  artifactPrefs: { shadcn: true, accessibility: true, responsive: true, strictBackend: true },
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsPayload>(defaultPayload);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState({ openrouter: "", together: "", gemini: "", anthropic: "", databaseUrl: "" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/settings", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("unauthorized");
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) setSettings({ ...defaultPayload, ...payload });
      })
      .catch((error) => {
        if (!cancelled) toast({ title: "Settings unavailable", description: error.message === "unauthorized" ? "Sign in to manage personal generation settings." : "Could not load settings.", variant: "destructive" });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const configuredCount = useMemo(() => {
    return [settings.aiKeys?.openrouter, settings.aiKeys?.together, settings.aiKeys?.gemini, settings.aiKeys?.anthropic, settings.database].filter((item: any) => item?.configured).length;
  }, [settings]);

  async function save(patch: Partial<SettingsPayload> & { aiKeys?: any; database?: any }) {
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = await res.json();
      setSettings({ ...defaultPayload, ...next });
      toast({ title: "Settings saved" });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function saveSecrets() {
    const aiKeys: Record<string, { value: string }> = {};
    if (secrets.openrouter.trim()) aiKeys.openrouter = { value: secrets.openrouter };
    if (secrets.together.trim()) aiKeys.together = { value: secrets.together };
    if (secrets.gemini.trim()) aiKeys.gemini = { value: secrets.gemini };
    if (secrets.anthropic.trim()) aiKeys.anthropic = { value: secrets.anthropic };
    const database = secrets.databaseUrl.trim() ? { url: { value: secrets.databaseUrl }, provider: settings.database.provider || "postgres" } : undefined;
    void save({ aiKeys, ...(database ? { database } : {}) });
    setSecrets({ openrouter: "", together: "", gemini: "", anthropic: "", databaseUrl: "" });
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Personal workspace</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Generation settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Configure your own model keys, database, MCP servers, and external connectors. These settings are stored per user and are intended for your builds and artifacts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline"><Link href="/">Back to builder</Link></Button>
            <Button disabled={saving || loading} onClick={() => void save({ defaultModel: settings.defaultModel, defaultMode: settings.defaultMode, promptStyle: settings.promptStyle, artifactPrefs: settings.artifactPrefs })}>
              <Check className="size-4" /> Save
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" /> Secrets</CardTitle><CardDescription>{configuredCount} configured</CardDescription></CardHeader></Card>
          <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="size-4" /> MCP servers</CardTitle><CardDescription>{settings.mcpServers.length} server entries</CardDescription></CardHeader></Card>
          <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="size-4" /> Connectors</CardTitle><CardDescription>{settings.connectors.length} connector entries</CardDescription></CardHeader></Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Defaults</CardTitle>
              <CardDescription>Used by new app generations unless the composer overrides them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label htmlFor="default-model">Default model</Label><Input id="default-model" value={settings.defaultModel} onChange={(e) => setSettings((s) => ({ ...s, defaultModel: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="default-mode">Default mode</Label><Input id="default-mode" value={settings.defaultMode} onChange={(e) => setSettings((s) => ({ ...s, defaultMode: e.target.value as any }))} /></div>
              <div className="grid gap-2"><Label htmlFor="prompt-style">Prompt style</Label><Input id="prompt-style" value={settings.promptStyle} onChange={(e) => setSettings((s) => ({ ...s, promptStyle: e.target.value }))} /></div>
              <div className="grid gap-3 rounded-2xl border border-border p-3">
                {Object.entries(settings.artifactPrefs).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <Switch checked={Boolean(value)} onCheckedChange={(checked) => setSettings((s) => ({ ...s, artifactPrefs: { ...s.artifactPrefs, [key]: checked } }))} />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="size-5" /> AI keys and database</CardTitle>
              <CardDescription>Paste new values to update. Existing values stay masked and are not shown again.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2"><Label>OpenRouter API key {settings.aiKeys?.openrouter?.configured ? `(${settings.aiKeys.openrouter.masked})` : ""}</Label><Input type="password" value={secrets.openrouter} onChange={(e) => setSecrets((s) => ({ ...s, openrouter: e.target.value }))} placeholder="sk-or-..." /></div>
              <div className="grid gap-2"><Label>Together API key {settings.aiKeys?.together?.configured ? `(${settings.aiKeys.together.masked})` : ""}</Label><Input type="password" value={secrets.together} onChange={(e) => setSecrets((s) => ({ ...s, together: e.target.value }))} placeholder="tgp_..." /></div>
              <div className="grid gap-2"><Label>Gemini API key {settings.aiKeys?.gemini?.configured ? `(${settings.aiKeys.gemini.masked})` : ""}</Label><Input type="password" value={secrets.gemini} onChange={(e) => setSecrets((s) => ({ ...s, gemini: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Anthropic API key {settings.aiKeys?.anthropic?.configured ? `(${settings.aiKeys.anthropic.masked})` : ""}</Label><Input type="password" value={secrets.anthropic} onChange={(e) => setSecrets((s) => ({ ...s, anthropic: e.target.value }))} /></div>
              <div className="grid gap-2 md:col-span-2"><Label>Database URL {settings.database?.configured ? `(${settings.database.masked})` : ""}</Label><Input type="password" value={secrets.databaseUrl} onChange={(e) => setSecrets((s) => ({ ...s, databaseUrl: e.target.value }))} placeholder="postgres://..." /></div>
              <div className="md:col-span-2"><Button disabled={saving} onClick={saveSecrets}>Save private values</Button></div>
            </CardContent>
          </Card>
        </section>

        <section id="mcp" className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Server className="size-5" /> MCP servers</CardTitle><CardDescription>Add external tools your generations can reference.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {settings.mcpServers.map((server, index) => (
                <div key={server.id} className="grid gap-2 rounded-2xl border border-border p-3">
                  <Input value={server.name} onChange={(e) => setSettings((s) => ({ ...s, mcpServers: s.mcpServers.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} placeholder="Server name" />
                  <Input value={server.url} onChange={(e) => setSettings((s) => ({ ...s, mcpServers: s.mcpServers.map((item, i) => i === index ? { ...item, url: e.target.value } : item) }))} placeholder="https://mcp.example.com" />
                  <Input value={server.token || ""} onChange={(e) => setSettings((s) => ({ ...s, mcpServers: s.mcpServers.map((item, i) => i === index ? { ...item, token: e.target.value } : item) }))} placeholder="Optional token" />
                </div>
              ))}
              <Button variant="outline" onClick={() => setSettings((s) => ({ ...s, mcpServers: [...s.mcpServers, { id: uid("mcp"), name: "New MCP server", url: "", enabled: true }] }))}>Add MCP server</Button>
            </CardContent>
          </Card>

          <Card id="connectors" className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="size-5" /> External connectors</CardTitle><CardDescription>Webhook, API, database, or MCP connector endpoints.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {settings.connectors.map((connector, index) => (
                <div key={connector.id} className="grid gap-2 rounded-2xl border border-border p-3">
                  <Input value={connector.name} onChange={(e) => setSettings((s) => ({ ...s, connectors: s.connectors.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} placeholder="Connector name" />
                  <Input value={connector.type} onChange={(e) => setSettings((s) => ({ ...s, connectors: s.connectors.map((item, i) => i === index ? { ...item, type: e.target.value as any } : item) }))} placeholder="webhook | api | database | mcp" />
                  <Input value={connector.endpoint} onChange={(e) => setSettings((s) => ({ ...s, connectors: s.connectors.map((item, i) => i === index ? { ...item, endpoint: e.target.value } : item) }))} placeholder="https://api.example.com" />
                  <Input value={connector.token || ""} onChange={(e) => setSettings((s) => ({ ...s, connectors: s.connectors.map((item, i) => i === index ? { ...item, token: e.target.value } : item) }))} placeholder="Optional token" />
                </div>
              ))}
              <Button variant="outline" onClick={() => setSettings((s) => ({ ...s, connectors: [...s.connectors, { id: uid("conn"), name: "New connector", type: "webhook", endpoint: "", enabled: true }] }))}>Add connector</Button>
              <Button className="ml-2" disabled={saving} onClick={() => void save({ mcpServers: settings.mcpServers, connectors: settings.connectors })}>Save integrations</Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
