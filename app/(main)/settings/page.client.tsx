"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Github, Loader2, RotateCcw, Save, Settings2, SlidersHorizontal, UploadCloud, Zap, Plug, Trash2, Edit2, TestTube2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { McpServerDialog } from "@/components/mcp/mcp-server-dialog";

type BuilderSettings = {
  defaultModel: string;
  defaultMode: "ask" | "plan" | "agent";
  defaultFramework: "next" | "react" | "vite";
  defaultStyling: "shadcn" | "tailwind" | "css";
  packageManager: "pnpm" | "npm" | "bun";
  previewMode: "web" | "mobile" | "split";
  deployTarget: "vercel" | "none";
  defaultBranch: string;
  githubRepositoryUrl: string;
  webSearchDefault: boolean;
  deepThinkingDefault: boolean;
  canvasDefault: boolean;
  backendDefault: boolean;
  shadcnDefault: boolean;
  styleDefault: string;
  autoStartGeneration: boolean;
  autoRepairPreview: boolean;
  memoryCompression: boolean;
  saveArtifactsToWorkspace: boolean;
  enableBlobUploads: boolean;
  generateOgImages: boolean;
  accessibilityStrictMode: boolean;
};

const defaults: BuilderSettings = {
  defaultModel: "zai-org/GLM-5",
  defaultMode: "agent",
  defaultFramework: "next",
  defaultStyling: "shadcn",
  packageManager: "pnpm",
  previewMode: "split",
  deployTarget: "vercel",
  defaultBranch: "main",
  githubRepositoryUrl: "",
  webSearchDefault: false,
  deepThinkingDefault: false,
  canvasDefault: false,
  backendDefault: false,
  shadcnDefault: true,
  styleDefault: "glassmorphism",
  autoStartGeneration: true,
  autoRepairPreview: true,
  memoryCompression: true,
  saveArtifactsToWorkspace: true,
  enableBlobUploads: true,
  generateOgImages: true,
  accessibilityStrictMode: true,
};

function NativeSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
        {children}
      </select>
    </label>
  );
}

function SettingSwitch({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background px-5 py-5 shadow-sm">
      <div className="flex gap-3 border-b border-border/60 pb-4">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40 text-foreground">{icon}</div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

export default function SettingsPageClient() {
  const [settings, setSettings] = useState<BuilderSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const visibleModels = useMemo(() => MODELS.filter((model) => !model.hidden), []);

  // MCP Servers management
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [editingMcp, setEditingMcp] = useState<any>(null);
  const [mcpLoading, setMcpLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/user-settings", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Could not load settings.");
        if (!cancelled) setSettings({ ...defaults, ...(data?.settings || {}) });
      } catch (error) {
        toast({ title: "Settings failed to load", description: error instanceof Error ? error.message : "Unknown error.", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    loadMcpServers();
    return () => { cancelled = true; };
  }, []);

  async function loadMcpServers() {
    try {
      const res = await fetch("/api/mcp", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMcpServers(data.servers || []);
      }
    } catch {}
  }

  function update<K extends keyof BuilderSettings>(key: K, value: BuilderSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not save settings.");
      setSettings({ ...defaults, ...(data?.settings || {}) });
      setSaved(true);
      toast({ title: "Settings saved", description: "Builder defaults are now active for your workspace." });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Unknown error.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSaved(false);
    setSettings(defaults);
  }

  return (
    <main className="min-h-dvh bg-muted/20 px-4 py-6 text-foreground md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Settings2 className="size-3.5" /> Workspace preferences
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Builder settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Configure the default model, framework, preview behavior, repair loop, uploads, and GitHub routing used by new vibe-coding builds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={resetSettings} disabled={loading || saving} className="rounded-xl"><RotateCcw className="size-4" />Reset</Button>
            <Button type="button" onClick={saveSettings} disabled={loading || saving} className="rounded-xl">
              {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
              {saving ? "Saving" : saved ? "Saved" : "Save settings"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-border bg-background">
            <div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading settings</div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={<Zap className="size-4" />} title="Generation defaults" description="The baseline behavior used when a new build starts from the home prompt.">
              <div className="grid gap-4 md:grid-cols-2">
                <NativeSelect label="Default model" value={settings.defaultModel} onChange={(value) => update("defaultModel", value)}>
                  {visibleModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </NativeSelect>
                <NativeSelect label="Build mode" value={settings.defaultMode} onChange={(value) => update("defaultMode", value as BuilderSettings["defaultMode"])}>
                  <option value="agent">Agent</option><option value="plan">Plan</option><option value="ask">Ask</option>
                </NativeSelect>
                <NativeSelect label="Framework" value={settings.defaultFramework} onChange={(value) => update("defaultFramework", value as BuilderSettings["defaultFramework"])}>
                  <option value="next">Next.js App Router</option><option value="react">React</option><option value="vite">Vite</option>
                </NativeSelect>
                <NativeSelect label="Styling" value={settings.defaultStyling} onChange={(value) => update("defaultStyling", value as BuilderSettings["defaultStyling"])}>
                  <option value="shadcn">shadcn/ui</option><option value="tailwind">Tailwind only</option><option value="css">Plain CSS</option>
                </NativeSelect>
                <NativeSelect label="Default output style" value={settings.styleDefault} onChange={(value) => update("styleDefault", value)}>
                  <option value="modern-saas">Modern SaaS (indigo)</option><option value="editorial-dark">Editorial (amber)</option><option value="warm-neutral">Warm (orange)</option><option value="vibrant-accent">Vibrant (violet)</option><option value="glassmorphism">Glass (cyan)</option>
                </NativeSelect>
              </div>
              <div className="mt-4">
                <SettingSwitch title="Default shadcn UI" description="Start new builds with shadcn-style components and accessible form primitives." checked={settings.shadcnDefault} onChange={(value) => update("shadcnDefault", value)} />
                <SettingSwitch title="Deep thinking by default" description="Use the reasoning-capable generation mode for complex builds." checked={settings.deepThinkingDefault} onChange={(value) => update("deepThinkingDefault", value)} />
                <SettingSwitch title="Backend by default" description="Start new builds with database-ready backend scaffolding and server routes when the app needs real persistence." checked={settings.backendDefault} onChange={(value) => update("backendDefault", value)} />
                <SettingSwitch title="Web search by default" description="Reserve source-aware UI states for builds that need external data." checked={settings.webSearchDefault} onChange={(value) => update("webSearchDefault", value)} />
                <SettingSwitch title="Canvas by default" description="Add editable visual workspace behavior when the app request benefits from it." checked={settings.canvasDefault} onChange={(value) => update("canvasDefault", value)} />
              </div>
            </Section>

            <Section icon={<SlidersHorizontal className="size-4" />} title="Runtime and preview" description="Control how generated artifacts are previewed, repaired, and persisted.">
              <div className="grid gap-4 md:grid-cols-2">
                <NativeSelect label="Preview mode" value={settings.previewMode} onChange={(value) => update("previewMode", value as BuilderSettings["previewMode"])}>
                  <option value="split">Split</option><option value="web">Web</option><option value="mobile">Mobile</option>
                </NativeSelect>
                <NativeSelect label="Package manager" value={settings.packageManager} onChange={(value) => update("packageManager", value as BuilderSettings["packageManager"])}>
                  <option value="pnpm">pnpm</option><option value="npm">npm</option><option value="bun">bun</option>
                </NativeSelect>
              </div>
              <div className="mt-4">
                <SettingSwitch title="Auto-start generation" description="After creating a chat, immediately stream the first build response." checked={settings.autoStartGeneration} onChange={(value) => update("autoStartGeneration", value)} />
                <SettingSwitch title="Auto-repair preview" description="Capture runtime and blank-preview errors and prepare repair instructions." checked={settings.autoRepairPreview} onChange={(value) => update("autoRepairPreview", value)} />
                <SettingSwitch title="Memory compression" description="Compress older build turns so long projects remain fast and coherent." checked={settings.memoryCompression} onChange={(value) => update("memoryCompression", value)} />
                <SettingSwitch title="Save artifacts to workspace" description="Persist generated files and project metadata to the backend workspace." checked={settings.saveArtifactsToWorkspace} onChange={(value) => update("saveArtifactsToWorkspace", value)} />
                <SettingSwitch title="Strict accessibility" description="Prefer keyboard-safe controls, labels, semantic regions, and accessible states." checked={settings.accessibilityStrictMode} onChange={(value) => update("accessibilityStrictMode", value)} />
              </div>
            </Section>

            <Section icon={<Github className="size-4" />} title="GitHub" description="Defaults used by repository import and future pull-request workflows.">
              <div className="grid gap-4">
                <label className="grid gap-2"><span className="text-sm font-medium">Default repository URL</span><Input value={settings.githubRepositoryUrl} onChange={(event) => update("githubRepositoryUrl", event.target.value)} placeholder="https://github.com/pichimail/llamacoder" className="h-11 rounded-xl" /></label>
                <label className="grid gap-2"><span className="text-sm font-medium">Default branch</span><Input value={settings.defaultBranch} onChange={(event) => update("defaultBranch", event.target.value)} placeholder="main" className="h-11 rounded-xl" /></label>
              </div>
            </Section>

            <Section icon={<UploadCloud className="size-4" />} title="Publishing and assets" description="Backend switches for uploads, preview sharing, and generated social images.">
              <div className="grid gap-4 md:grid-cols-2">
                <NativeSelect label="Share target" value={settings.deployTarget} onChange={(value) => update("deployTarget", value as BuilderSettings["deployTarget"])}>
                  <option value="vercel">Public share</option><option value="none">No default publish</option>
                </NativeSelect>
              </div>
              <div className="mt-4">
                <SettingSwitch title="Blob uploads" description="Use the server Blob upload route for images, PDFs, ZIP files, and project inputs." checked={settings.enableBlobUploads} onChange={(value) => update("enableBlobUploads", value)} />
                <SettingSwitch title="Generate OG images" description="Create preview/social images for saved or published generated apps." checked={settings.generateOgImages} onChange={(value) => update("generateOgImages", value)} />
              </div>
            </Section>

            {/* MCP Servers - full management */}
            <Section icon={<Plug className="size-4" />} title="MCP Servers" description="Connect Model Context Protocol servers. These are available across your prompt inputs and attached to generated apps/artifacts for tool calling and external context.">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-muted-foreground">Your saved MCP connectors ({mcpServers.length})</div>
                <Button size="sm" onClick={() => { setEditingMcp(null); setMcpDialogOpen(true); }} className="rounded-xl">
                  <Plug className="size-4 mr-1" /> Add MCP Server
                </Button>
              </div>

              {mcpServers.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No MCP servers yet. Add one to use in generations and chats.
                </div>
              ) : (
                <div className="space-y-2">
                  {mcpServers.map((srv) => (
                    <div key={srv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {srv.name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{srv.transport}</span>
                          {srv.hasSecret && <span className="text-[10px] text-emerald-600">auth</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{srv.url}</div>
                        {srv.description && <div className="text-xs mt-0.5 text-muted-foreground/80">{srv.description}</div>}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs">
                          <Switch checked={srv.enabled} onCheckedChange={async (v) => {
                            setMcpLoading(true);
                            try {
                              await fetch("/api/mcp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: srv.id, enabled: v }) });
                              await loadMcpServers();
                            } finally { setMcpLoading(false); }
                          }} />
                          <span className="text-muted-foreground">On</span>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => runMcpTest(srv.id)} disabled={mcpLoading}>
                          <TestTube2 className="size-3.5" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => { setEditingMcp(srv); setMcpDialogOpen(true); }}>
                          <Edit2 className="size-3.5" />
                        </Button>

                        <Button variant="ghost" size="sm" onClick={async () => {
                          if (!confirm(`Delete ${srv.name}?`)) return;
                          setMcpLoading(true);
                          await fetch(`/api/mcp?id=${srv.id}`, { method: "DELETE" });
                          await loadMcpServers();
                          setMcpLoading(false);
                        }}>
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <McpServerDialog
                open={mcpDialogOpen}
                onOpenChange={(o) => { setMcpDialogOpen(o); if (!o) setEditingMcp(null); }}
                initialData={editingMcp}
                mode={editingMcp ? "edit" : "add"}
                onSaved={async () => { await loadMcpServers(); }}
              />
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}

async function runMcpTest(id: string) {
  try {
    const res = await fetch("/api/mcp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    toast({ title: j.ok ? "Connected" : "Test result", description: j.message });
  } catch (e: any) {
    toast({ title: "Test failed", description: e.message, variant: "destructive" });
  }
}
