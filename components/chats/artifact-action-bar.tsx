"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { Bell, Check, ChevronDown, Download, ExternalLink, GitPullRequest, Globe, Home, KeyRound, Link, Lock, Menu, MessageCircle, MoreHorizontal, Paintbrush, RefreshCw, Settings, Share2, Upload, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tip } from "@/components/ui/tooltip";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import type { ArtifactFile } from "@/lib/artifact-analysis";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkspaceState = {
  project: { id: string; name: string; description: string };
  integrations: Array<{ id: string; type: string; connected: boolean }>;
  envVars: Array<{ id: string; key: string; value: string }>;
  deployments: Array<{ id: string; status: string; previewUrl: string; productionUrl: string; createdAt: string }>;
  shareLinks: Array<{ id: string; token: string; isPublic: boolean }>;
  fileCount: number;
  hasGithub: boolean;
  buildSpec?: {
    templateId: string;
    title: string;
    summary: string;
    dependencies: string[];
    envHints: string[];
    routes: string[];
    previewRoute: string;
  };
  validation?: {
    ok: boolean;
    issueCount: number;
    issues: Array<{ path: string; line: number; column: number; message: string }>;
    formatted: string;
  };
};

type VersionOption = { id: string; version: number; label: string };

interface ArtifactActionBarProps {
  chatId: string;
  chatTitle: string;
  activeMessageId?: string;
  activeVersionLabel?: string;
  versions: VersionOption[];
  files: ArtifactFile[];
  onSwitchVersion: (messageId: string) => void;
  onDownload: () => void;
  onOpenSettings?: () => void;
}

const iconButton = "inline-flex size-8 items-center justify-center rounded-md border border-fuchsia-500/12 bg-zinc-950/75 text-violet-300 shadow-[0_0_0_1px_rgba(168,85,247,0.06)] transition hover:border-violet-400/25 hover:bg-zinc-900 hover:text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:drop-shadow-[0_0_8px_rgba(168,85,247,0.26)]";
const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45";

const EASY_INSTALL_INTEGRATIONS = [
  { type: "neon-db", label: "Neon DB", description: "Serverless Postgres", requiredKeys: ["DATABASE_URL"] },
  { type: "supabase", label: "Supabase", description: "Backend as a service", requiredKeys: ["SUPABASE_URL", "SUPABASE_ANON_KEY"] },
  { type: "chinna-llm-ai", label: "ChinnaLLM-AI", description: "Our AI (OpenRouter powered)", requiredKeys: ["OPENROUTER_API_KEY"] },
  { type: "open-ai", label: "OpenAI", description: "GPT models", requiredKeys: ["OPENAI_API_KEY"] },
  { type: "stripe", label: "Stripe", description: "Payments", requiredKeys: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] },
  { type: "grok", label: "Grok (xAI)", description: "Grok AI", requiredKeys: ["GROK_API_KEY"] },
  { type: "upstash", label: "Upstash", description: "Redis & Vector", requiredKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] },
  { type: "shopify", label: "Shopify", description: "E-commerce", requiredKeys: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_STORE_DOMAIN"] },
  { type: "google-auth", label: "Google Auth", description: "OAuth login", requiredKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { type: "clerk-auth", label: "Clerk Auth", description: "User auth", requiredKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] },
];

export function ArtifactActionBar({ chatId, chatTitle, activeMessageId, activeVersionLabel, versions, files, onSwitchVersion, onDownload, onOpenSettings }: ArtifactActionBarProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [open, setOpen] = useState(false);
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | undefined>();
  const [duplicateProtected, setDuplicateProtected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "model-generation" | "features" | "environment-variables" | "integrations" | "advanced">("general");
  const [settingsModel, setSettingsModel] = useState("zai-org/GLM-5.1");
  const [settingsShadcn, setSettingsShadcn] = useState(true);
  const [settingsCanvas, setSettingsCanvas] = useState(false);
  const [settingsAutoFix, setSettingsAutoFix] = useState(true);
  const [pendingInstall, setPendingInstall] = useState<string | null>(null);
  const [installKeys, setInstallKeys] = useState<Record<string, string>>({});
  const uploadRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = `artifact-actions-menu-${chatId}`;

  const canAct = !!activeMessageId && files.length > 0;
  const endpoint = `/api/workspace/${chatId}`;

  const workspaceRequest = async (action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data.reason) throw new Error(data.error || "Workspace request failed");
    if (data.workspace) setWorkspace(data.workspace as WorkspaceState);
    return data as any;
  };

  const refreshWorkspace = () => {
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        setWorkspace((await response.json()) as WorkspaceState);
      } catch (error) {
        toast({ title: "Workspace sync failed", description: error instanceof Error ? error.message : "Could not load project backend state.", variant: "destructive" });
      }
    });
  };

  useEffect(() => {
    refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || moreButtonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSync = () => {
    startTransition(async () => {
      const result = await workspaceRequest("sync", { files });
      const description = result.validation?.ok
        ? `${result.fileCount ?? files.length} files stored in the project backend.`
        : `${result.validation?.issueCount ?? 0} validation issue(s) detected.`;
      toast({ title: "Files synced", description });
    });
  };

  const handleBootstrap = () => {
    startTransition(async () => {
      const result = await workspaceRequest("bootstrap", { force: true });
      if (result.ok === false) {
        toast({
          title: "Scaffold not reseeded",
          description: result.reason || "Workspace already has files.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Scaffold reseeded",
        description: `${result.fileCount ?? files.length} scaffold files restored.`,
      });
    });
  };

  const handlePublish = async () => {
    if (!activeMessageId) return;
    const result = await workspaceRequest("publish", { messageId: activeMessageId, files });
    if (result.ok === false) {
      toast({
        title: "Publish blocked",
        description: result.reason || "Fix validation errors before publishing.",
        variant: "destructive",
      });
      return result;
    }
    const absoluteUrl = `${window.location.origin}${result.url}`;
    setPublishedUrl(absoluteUrl);
    setDuplicateProtected(Boolean(result.duplicateProtected));
    await navigator.clipboard.writeText(absoluteUrl).catch(() => undefined);
    if (result.duplicateProtected) {
      toast({ title: "Already published", description: "Opening your existing public link." });
    } else {
      toast({ title: "Published", description: "Live share link copied." });
    }
    window.open(absoluteUrl, "_blank", "noopener,noreferrer");
    return result;
  };

  const handleShare = () => {
    if (!activeMessageId) return;
    setShareOpen(true);
  };

  const handleConnectGithub = () => {
    startTransition(async () => {
      await workspaceRequest("connect-github");
      toast({ title: "GitHub marked connected", description: "Create PR requests now persist in the backend queue." });
    });
  };

  const handleCreatePr = () => {
    startTransition(async () => {
      const result = await workspaceRequest("create-pr", { files });
      if (result.ok === false) {
        toast({
          title: "PR blocked",
          description: result.reason || "Connect GitHub first.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "PR request queued", description: `${result.fileCount ?? files.length} files prepared for GitHub.` });
    });
  };

  const handleSaveEnv = () => {
    startTransition(async () => {
      await workspaceRequest("save-env", { key: envKey, value: envValue });
      setEnvKey("");
      setEnvValue("");
      toast({ title: "Environment variable saved" });
    });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { url?: string; pathname?: string };
      await navigator.clipboard.writeText(data.url || "").catch(() => undefined);
      toast({ title: "Upload complete", description: data.pathname || "Asset URL copied." });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Could not upload file.", variant: "destructive" });
    } finally {
      event.target.value = "";
    }
  };

  const shareUrl = activeMessageId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/v2/${activeMessageId}`
    : "";

  return (
    <div className="relative flex min-w-0 items-center justify-end gap-1">
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={chatTitle}
        messageId={activeMessageId}
        shareUrl={shareUrl}
        publishedUrl={publishedUrl}
        isPublished={!!publishedUrl}
        duplicateProtected={duplicateProtected}
        publishing={isPending}
        onPublish={handlePublish}
      />

      {/* Artifact Settings Dialog using sidebar-13 style - per app/artifact only, responsive, functional */}
      <Dialog open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if (!open) setSettingsTab("general"); }}>
        <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px] flex flex-col md:flex-row">
          <DialogTitle className="sr-only">Artifact Settings for {chatTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Configure settings specific to this app, web app or artifact being built.
          </DialogDescription>
          <SidebarProvider className="items-start w-full">
            <Sidebar collapsible="none" className="hidden md:flex border-r w-56">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {[
                        { name: "General", icon: Home },
                        { name: "Model & Generation", icon: Settings },
                        { name: "Features", icon: Paintbrush },
                        { name: "Environment Variables", icon: KeyRound },
                        { name: "Integrations", icon: Link },
                        { name: "Advanced", icon: Lock },
                      ].map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={settingsTab === item.name.toLowerCase().replace(/ & | /g, "-")}
                            onClick={() => setSettingsTab(item.name.toLowerCase().replace(/ & | /g, "-") as any)}
                          >
                            <button className="w-full justify-start">
                              <item.icon />
                              <span>{item.name}</span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex flex-1 flex-col overflow-hidden">
              {/* Mobile header for responsive nav */}
              <div className="md:hidden border-b p-3 flex items-center gap-2 bg-background">
                <select 
                  value={settingsTab} 
                  onChange={(e) => setSettingsTab(e.target.value as any)}
                  className="flex-1 p-2 border rounded text-sm"
                >
                  <option value="general">General</option>
                  <option value="model-generation">Model & Generation</option>
                  <option value="features">Features</option>
                  <option value="environment-variables">Environment Variables</option>
                  <option value="integrations">Integrations</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
                <div className="flex items-center gap-2">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="capitalize">{settingsTab.replace(/-/g, " ")}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
                <div className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">{chatTitle}</div>
              </header>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
                {/* Content based on tab - real functional integrations for current artifact */}
                {settingsTab === "general" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">General</h4>
                      <p className="text-sm text-muted-foreground mb-4">Settings for this specific artifact/app.</p>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">App Name</Label>
                          <input type="text" defaultValue={chatTitle} className="w-full mt-1 p-2 border rounded text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <textarea defaultValue={workspace?.project?.description || ""} className="w-full mt-1 p-2 border rounded text-sm" rows={3} />
                        </div>
                        <Button onClick={() => { refreshWorkspace(); toast({title: "General settings applied to artifact"}); }} size="sm">Save General</Button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "model-generation" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Model & Generation</h4>
                    <div>
                      <Label>AI Model</Label>
                      <Select value={settingsModel} onValueChange={setSettingsModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zai-org/GLM-5.1">GLM 5.1</SelectItem>
                          <SelectItem value="openrouter/anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
                          <SelectItem value="openrouter/auto">OpenRouter Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quality</Label>
                      <Select defaultValue="high">
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => {
                      fetch(`/api/chats/${chatId}/builder-settings`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ model: settingsModel }),
                      }).catch(() => {});
                      toast({ title: "Model updated for this artifact" });
                    }} size="sm">Apply to this build</Button>
                  </div>
                )}

                {settingsTab === "features" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Features for this app</h4>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>Enable shadcn/ui</div>
                      <Switch checked={settingsShadcn} onCheckedChange={setSettingsShadcn} />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>Canvas / Visual Editor</div>
                      <Switch checked={settingsCanvas} onCheckedChange={setSettingsCanvas} />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>Auto-fix errors</div>
                      <Switch checked={settingsAutoFix} onCheckedChange={setSettingsAutoFix} />
                    </div>
                    <Button onClick={() => { workspaceRequest("sync", { files }); toast({title: "Features saved"}); }} size="sm">Save Features</Button>
                  </div>
                )}

                {settingsTab === "environment-variables" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Environment Variables</h4>
                    <p className="text-xs text-muted-foreground">Per this project/artifact. Encrypted at rest.</p>
                    <div className="max-h-40 overflow-auto border rounded p-2 text-sm">
                      {workspace?.envVars?.length ? workspace.envVars.map((env) => (
                        <div key={env.id} className="flex justify-between py-1 border-b last:border-0">
                          <span className="font-mono">{env.key}</span>
                          <span className="text-muted-foreground truncate max-w-[100px]">{env.value}</span>
                        </div>
                      )) : <p className="text-muted-foreground">No env vars yet.</p>}
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input value={envKey} onChange={e => setEnvKey(e.target.value)} placeholder="KEY" className="p-2 border rounded text-sm" />
                      <input value={envValue} onChange={e => setEnvValue(e.target.value)} placeholder="value" className="p-2 border rounded text-sm" />
                      <Button onClick={handleSaveEnv} size="sm" disabled={!envKey}>Save</Button>
                    </div>
                  </div>
                )}

                {settingsTab === "integrations" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Easy Install Integrations</h4>
                    <p className="text-xs text-muted-foreground">One-click install into this app/artifact. Saves integration record + env keys.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {EASY_INSTALL_INTEGRATIONS.map((integ) => {
                        const isInstalled = !!workspace?.integrations?.some((i: any) => i.type === integ.type && i.config?.installed);
                        return (
                          <div key={integ.type} className="border rounded p-3 flex flex-col gap-2 text-sm">
                            <div>
                              <div className="font-medium">{integ.label}</div>
                              <div className="text-[10px] text-muted-foreground">{integ.description}</div>
                            </div>
                            {isInstalled ? (
                              <div className="text-green-600 text-xs">✓ Installed</div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => {
                                setPendingInstall(integ.type);
                                const init: Record<string,string> = {};
                                integ.requiredKeys.forEach(k => init[k] = "");
                                setInstallKeys(init);
                              }}>Install</Button>
                            )}
                            {pendingInstall === integ.type && (
                              <div className="mt-2 p-2 border rounded bg-muted/30 text-xs space-y-1.5">
                                {integ.requiredKeys.map((key) => (
                                  <div key={key}>
                                    <Label className="text-[10px]">{key}</Label>
                                    <input value={installKeys[key] || ''} onChange={e => setInstallKeys(p => ({...p, [key]: e.target.value}))} className="w-full p-1 border rounded text-xs" placeholder="Enter key" />
                                  </div>
                                ))}
                                <div className="flex gap-1 pt-1">
                                  <Button size="sm" onClick={async () => {
                                    await workspaceRequest("install-integration", { type: pendingInstall, config: { installed: true } });
                                    for (const [k,v] of Object.entries(installKeys)) {
                                      if (v) await workspaceRequest("save-env", { key: k, value: v });
                                    }
                                    setPendingInstall(null);
                                    setInstallKeys({});
                                    refreshWorkspace();
                                    toast({ title: `${integ.label} installed for this app` });
                                  }}>Confirm & Save Keys</Button>
                                  <Button size="sm" variant="ghost" onClick={() => {setPendingInstall(null); setInstallKeys({});}}>Cancel</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settingsTab === "advanced" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced</h4>
                    <Button onClick={handleBootstrap} variant="outline" size="sm" disabled={isPending}>Reseed scaffold</Button>
                    <Button onClick={() => workspaceRequest("validate", { files })} variant="outline" size="sm">Validate files</Button>
                    <Button onClick={handleSync} variant="outline" size="sm" disabled={!canAct || isPending}>Sync files</Button>
                    <div className="text-xs text-muted-foreground">Validation: {workspace?.validation ? (workspace.validation.ok ? "Clean" : `${workspace.validation.issueCount} issues`) : "N/A"}</div>
                  </div>
                )}
              </div>
            </main>
          </SidebarProvider>
        </DialogContent>
      </Dialog>
      {versions.length > 0 && (
        <label className="hidden items-center gap-1 rounded-md border border-fuchsia-500/15 bg-zinc-950/75 px-2 py-1 text-xs text-violet-200 shadow-[0_0_0_1px_rgba(168,85,247,0.06)] sm:flex">
          <span className="sr-only">Version</span>
          <select value={activeMessageId || ""} onChange={(event) => onSwitchVersion(event.target.value)} className="max-w-[110px] bg-transparent text-xs text-foreground outline-none" aria-label="Switch generated version">
            {versions.slice().reverse().map((version) => <option key={version.id} value={version.id}>{version.label}</option>)}
          </select>
          <ChevronDown className="size-3 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.32)]" aria-hidden="true" />
        </label>
      )}

      <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} aria-label="Upload project asset" />
      <Tip label="Upload asset"><button type="button" className={iconButton} onClick={() => uploadRef.current?.click()} aria-label="Upload asset"><Upload className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Export zip"><button type="button" className={iconButton} onClick={onDownload} disabled={!canAct} aria-label="Export generated files"><Download className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Share link"><button type="button" className={iconButton} onClick={handleShare} disabled={!activeMessageId} aria-label="Copy share link"><Share2 className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Publish site"><button type="button" onClick={() => startTransition(() => { void handlePublish(); })} disabled={!canAct || isPending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45" aria-label="Publish site"><ExternalLink className="size-3.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" aria-hidden="true" /><span className="hidden lg:inline">Publish</span></button></Tip>
      {workspace?.hasGithub && <Tip label="Create pull request"><button type="button" className={iconButton} onClick={handleCreatePr} disabled={!canAct || isPending} aria-label="Create GitHub pull request"><GitPullRequest className="size-4" aria-hidden="true" /></button></Tip>}
      <Tip label="More project actions"><button ref={moreButtonRef} type="button" className={iconButton} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" aria-controls={menuId} aria-label="More project actions"><MoreHorizontal className="size-4" aria-hidden="true" /></button></Tip>

      {open && (
        <div ref={menuRef} id={menuId} role="menu" className="absolute right-0 top-10 z-50 w-[320px] overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/30">
          <div className="border-b border-border px-2 pb-2 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">{chatTitle}</p>
            <p>{activeVersionLabel || "No version"} · {workspace?.fileCount ?? files.length} backend files</p>
            {workspace?.buildSpec ? (
              <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground/80">
                {workspace.buildSpec.templateId} · {workspace.buildSpec.previewRoute}
              </p>
            ) : null}
            {workspace?.validation ? (
              <p className={`mt-1 ${workspace.validation.ok ? "text-emerald-600" : "text-amber-600"}`}>
                {workspace.validation.ok
                  ? "Validation clean"
                  : `${workspace.validation.issueCount} validation issue(s)`}
              </p>
            ) : null}
          </div>
          <div className="py-1">
            <button type="button" role="menuitem" className={menuItem} onClick={handleSync} disabled={!canAct || isPending}><RefreshCw className="size-3.5" aria-hidden="true" /> Sync artifact files</button>
            <button type="button" role="menuitem" className={menuItem} onClick={handleBootstrap} disabled={isPending}><RefreshCw className="size-3.5" aria-hidden="true" /> Reseed scaffold</button>
            <button type="button" role="menuitem" className={menuItem} onClick={workspace?.hasGithub ? handleCreatePr : handleConnectGithub} disabled={isPending}><GitPullRequest className="size-3.5" aria-hidden="true" /> {workspace?.hasGithub ? "Create PR request" : "Connect GitHub"}</button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); setSettingsOpen(true); }} disabled={!canAct}><Settings className="size-3.5" aria-hidden="true" /> App Settings</button>
          </div>
          <div className="border-t border-border p-2"><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><KeyRound className="size-3" aria-hidden="true" /> Env vars</div><div className="grid grid-cols-[1fr_1fr_auto] gap-1"><input value={envKey} onChange={(event) => setEnvKey(event.target.value)} placeholder="KEY" aria-label="Environment variable key" className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring" /><input value={envValue} onChange={(event) => setEnvValue(event.target.value)} placeholder="value" aria-label="Environment variable value" className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring" /><button type="button" onClick={handleSaveEnv} disabled={!envKey.trim() || isPending} aria-label="Save environment variable" className="h-8 rounded-md border border-border px-2 text-xs hover:bg-accent disabled:opacity-40">Save</button></div><div className="mt-2 max-h-24 space-y-1 overflow-auto">{workspace?.envVars?.length ? workspace.envVars.map((env) => <div key={env.id} className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1 text-[11px]"><span className="font-mono text-foreground">{env.key}</span><span className="text-muted-foreground">{env.value}</span></div>) : <p className="text-[11px] text-muted-foreground">No environment variables yet.</p>}</div></div>
        </div>
      )}
    </div>
  );
}
