"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { BarChart3, Boxes, CheckCircle2, Download, ExternalLink, GitBranch, GitPullRequest, Globe2, History, KeyRound, Link, Lock, MoreHorizontal, Plug, RefreshCw, Search, Server, Settings, Share2, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type WorkspaceState = {
  project: { id: string; name: string; description: string };
  integrations: Array<{ id: string; type: string; connected: boolean; config?: unknown }>;
  envVars: Array<{ id: string; key: string; value: string }>;
  deployments: Array<{ id: string; status: string; previewUrl: string; productionUrl: string; createdAt: string }>;
  shareLinks: Array<{ id: string; token: string; isPublic: boolean }>;
  domains: Array<{ id: string; domain: string; verified: boolean; createdAt: string }>;
  checkpoints: Array<{ id: string; name: string; createdAt: string }>;
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

const iconButton = "inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";
const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45";

const EASY_INSTALL_INTEGRATIONS = [
  { type: "neon-db", label: "Neon DB", description: "Serverless Postgres", requiredKeys: ["DATABASE_URL"] },
  { type: "supabase", label: "Supabase", description: "Backend as a service", requiredKeys: ["SUPABASE_URL", "SUPABASE_ANON_KEY"] },
  { type: "chinna-llm-ai", label: "ChinnaLLM", description: "Platform AI credits or BYOK", requiredKeys: ["CHINNALLM_ENABLED"] },
  { type: "open-ai", label: "OpenAI", description: "GPT models", requiredKeys: ["OPENAI_API_KEY"] },
  { type: "stripe", label: "Stripe", description: "Payments", requiredKeys: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] },
  { type: "grok", label: "Grok (xAI)", description: "Grok AI", requiredKeys: ["GROK_API_KEY"] },
  { type: "upstash", label: "Upstash", description: "Redis & Vector", requiredKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] },
  { type: "shopify", label: "Shopify", description: "E-commerce", requiredKeys: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_STORE_DOMAIN"] },
  { type: "google-auth", label: "Google Auth", description: "OAuth login", requiredKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { type: "clerk-auth", label: "Clerk Auth", description: "User auth", requiredKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] },
];

function validationDescription(result: any, fallback: string) {
  const formatted = typeof result?.validation?.formatted === "string"
    ? result.validation.formatted.trim()
    : "";
  if (formatted) return formatted.slice(0, 900);

  const issues = Array.isArray(result?.validation?.issues)
    ? result.validation.issues
    : [];
  if (issues.length > 0) {
    return issues
      .slice(0, 3)
      .map((issue: any) => {
        const path = issue?.path ? `${issue.path}: ` : "";
        return `${path}${issue?.message || "Validation issue"}`;
      })
      .join("\n");
  }

  return result?.reason || fallback;
}

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
  const [settingsTab, setSettingsTab] = useState<"vercel-project" | "integrations" | "environment-variables" | "ai-keys" | "github" | "template" | "domains" | "backups" | "seo" | "mcp" | "analytics" | "advanced">("vercel-project");
  const [appName, setAppName] = useState(chatTitle);
  const [appDescription, setAppDescription] = useState("");
  const [settingsModel, setSettingsModel] = useState("zai-org/GLM-5.1");
  const [settingsShadcn, setSettingsShadcn] = useState(false);
  const [settingsCanvas, setSettingsCanvas] = useState(false);
  const [settingsAutoFix, setSettingsAutoFix] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<string | null>(null);
  const [installKeys, setInstallKeys] = useState<Record<string, string>>({});
  const [domainInput, setDomainInput] = useState("");
  const [checkpointName, setCheckpointName] = useState("");
  const [byokKeys, setByokKeys] = useState<Array<{ id: string; provider: string; label?: string | null; masked: string }>>([]);
  const [byokKeyInput, setByokKeyInput] = useState("");
  const isMobile = useIsMobile();
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
    if (!workspace?.project) return;
    setAppName(workspace.project.name || chatTitle);
    setAppDescription(workspace.project.description || "");
  }, [chatTitle, workspace?.project]);

  useEffect(() => {
    const openSettings = () => {
      setSettingsTab("vercel-project");
      setSettingsOpen(true);
    };
    window.addEventListener("open-artifact-settings", openSettings);
    return () => window.removeEventListener("open-artifact-settings", openSettings);
  }, []);

  useEffect(() => {
    if (settingsTab === "ai-keys" && settingsOpen) loadByokKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTab, settingsOpen]);

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
        description: validationDescription(result, "Fix validation errors before publishing."),
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

  const handleSaveDomain = () => {
    if (!domainInput.trim()) return;
    startTransition(async () => {
      try {
        await workspaceRequest("save-domain", { domain: domainInput.trim() });
        setDomainInput("");
        toast({ title: "Domain added", description: "Point your DNS records to finish setup." });
      } catch (error) {
        toast({ title: "Could not add domain", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      }
    });
  };

  const handleRemoveDomain = (domainId: string) => {
    startTransition(async () => {
      await workspaceRequest("remove-domain", { domainId });
      toast({ title: "Domain removed" });
    });
  };

  const handleCreateCheckpoint = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/design/${chatId}/checkpoint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: checkpointName.trim() || "Manual backup" }),
        });
        if (!response.ok) throw new Error(await response.text());
        setCheckpointName("");
        refreshWorkspace();
        toast({ title: "Backup created" });
      } catch (error) {
        toast({ title: "Backup failed", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      }
    });
  };

  const handleRestoreCheckpoint = (checkpointId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/design/${chatId}/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkpointId }),
        });
        if (!response.ok) throw new Error(await response.text());
        toast({ title: "Restored from backup", description: "Reload to see the restored files." });
        refreshWorkspace();
      } catch (error) {
        toast({ title: "Restore failed", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      }
    });
  };

  const loadByokKeys = async () => {
    try {
      const response = await fetch("/api/chinnallm/byok", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setByokKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch {
      // Non-fatal — tab shows empty state.
    }
  };

  const handleSaveByokKey = () => {
    if (!byokKeyInput.trim()) return;
    startTransition(async () => {
      try {
        const response = await fetch("/api/chinnallm/byok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "openrouter", key: byokKeyInput.trim() }),
        });
        if (!response.ok) throw new Error(await response.text());
        setByokKeyInput("");
        loadByokKeys();
        toast({ title: "API key saved", description: "Used for BYOK chats across your account." });
      } catch (error) {
        toast({ title: "Could not save key", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      }
    });
  };

  const handleDeleteByokKey = (id: string) => {
    startTransition(async () => {
      await fetch("/api/chinnallm/byok", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
      loadByokKeys();
      toast({ title: "API key removed" });
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
  const hasVercelProject = !!workspace?.integrations.some((integration) => integration.type === "vercel-project");

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
      {isMobile ? (
        <Sheet open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if (!open) setSettingsTab("vercel-project"); }}>
          <SheetContent side="bottom" className="flex h-[92vh] flex-col overflow-hidden p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Artifact Settings for {chatTitle}</SheetTitle>
              <SheetDescription>Configure settings specific to this app, web app or artifact being built.</SheetDescription>
            </SheetHeader>
          <SidebarProvider className="items-start w-full">
            <Sidebar collapsible="none" className="hidden md:flex border-r w-56">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {[
                        { name: "Vercel Project", value: "vercel-project", icon: ExternalLink },
                        { name: "Integrations", value: "integrations", icon: Link },
                        { name: "Environment Variables", value: "environment-variables", icon: KeyRound },
                        { name: "AI API Keys", value: "ai-keys", icon: Plug },
                        { name: "GitHub", value: "github", icon: GitBranch },
                        { name: "Template", value: "template", icon: Boxes },
                        { name: "Domains", value: "domains", icon: Globe2 },
                        { name: "Backups", value: "backups", icon: History },
                        { name: "SEO", value: "seo", icon: Search },
                        { name: "MCP Servers", value: "mcp", icon: Server },
                        { name: "Analytics", value: "analytics", icon: BarChart3 },
                        { name: "Advanced", value: "advanced", icon: Lock },
                      ].map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={settingsTab === item.value}
                            onClick={() => setSettingsTab(item.value as any)}
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
                <Label className="sr-only" htmlFor="artifact-settings-tab-select">Artifact settings section</Label>
                <Select value={settingsTab} onValueChange={(value) => setSettingsTab(value as any)}>
                  <SelectTrigger id="artifact-settings-tab-select" className="flex-1 text-sm" aria-label="Artifact settings section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vercel-project">Vercel Project</SelectItem>
                    <SelectItem value="environment-variables">Environment Variables</SelectItem>
                    <SelectItem value="ai-keys">AI API Keys</SelectItem>
                    <SelectItem value="integrations">Integrations</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="domains">Domains</SelectItem>
                    <SelectItem value="backups">Backups</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="mcp">MCP Servers</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
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
                {settingsTab === "vercel-project" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-medium">{hasVercelProject ? "Vercel project connected" : "No Vercel project connected"}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{hasVercelProject ? "Project deployment metadata is tracked for this artifact." : "Create a tracked project record before external deployment is enabled."}</p>
                        </div>
                        <Button size="sm" onClick={async () => {
                          await workspaceRequest("update-project", { name: appName || chatTitle, description: appDescription });
                          await workspaceRequest("install-integration", { type: "vercel-project", config: { installed: true, projectName: appName || chatTitle } });
                          toast({ title: hasVercelProject ? "Vercel project refreshed" : "Vercel project created" });
                        }}>{hasVercelProject ? "Refresh" : "Create"}</Button>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border/70 p-4">
                      <Label className="text-xs" htmlFor="artifact-app-name">Project name</Label>
                      <Input id="artifact-app-name" type="text" value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="My app" aria-label="App name" />
                      <Label className="text-xs" htmlFor="artifact-app-description">Description</Label>
                      <Textarea id="artifact-app-description" value={appDescription} onChange={(event) => setAppDescription(event.target.value)} rows={3} placeholder="Describe this app" aria-label="App description" />
                      <Button onClick={async () => {
                        await workspaceRequest("update-project", { name: appName, description: appDescription });
                        toast({title: "Project settings saved"});
                      }} size="sm">Save Project</Button>
                    </div>
                  </div>
                )}

                {settingsTab === "template" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Template</h4>
                    <p className="text-sm text-muted-foreground">Build profile for this generated app.</p>
                    <div>
                      <Label>AI Model</Label>
                      <Select value={settingsModel} onValueChange={setSettingsModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zai-org/GLM-5.1">GLM 5.1</SelectItem>
                          <SelectItem value="openrouter/anthropic/claude-sonnet-4.5">ChinnaLLM Code</SelectItem>
                          <SelectItem value="openrouter/auto">ChinnaLLM Auto</SelectItem>
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
                    }} size="sm">Apply Template Settings</Button>
                  </div>
                )}

                {settingsTab === "analytics" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">Runtime analytics become available after the public share is published.</p>
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
                      <Input value={envKey} onChange={e => setEnvKey(e.target.value)} placeholder="KEY" className="text-sm" aria-label="Environment variable key" />
                      <Input value={envValue} onChange={e => setEnvValue(e.target.value)} placeholder="value" className="text-sm" aria-label="Environment variable value" />
                      <Button onClick={handleSaveEnv} size="sm" disabled={!envKey}>Save</Button>
                    </div>
                  </div>
                )}

                {settingsTab === "integrations" && (
                  <div className="space-y-4">
	                    <h4 className="font-medium">Integrations</h4>
	                    <p className="text-xs text-muted-foreground">Install services into this project and persist the required encrypted keys.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {EASY_INSTALL_INTEGRATIONS.map((integ) => {
	                        const isInstalled = !!workspace?.integrations?.some((i) => i.type === integ.type);
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
                                    <Label className="text-[10px]" htmlFor={`install-key-${integ.type}-${key}`}>{key}</Label>
                                    <Input id={`install-key-${integ.type}-${key}`} value={installKeys[key] || ''} onChange={e => setInstallKeys(p => ({...p, [key]: e.target.value}))} className="h-7 text-xs" placeholder="Enter key" aria-label={`${integ.label} ${key}`} />
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

                {settingsTab === "github" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">GitHub</h4>
                    <p className="text-sm text-muted-foreground">{workspace?.hasGithub ? "GitHub is connected for pull request creation." : "Connect GitHub before creating pull requests."}</p>
                    <Button onClick={handleConnectGithub} variant="outline" size="sm" disabled={isPending}>{workspace?.hasGithub ? "Reconnect GitHub" : "Connect GitHub"}</Button>
                  </div>
                )}

                {settingsTab === "domains" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Domains</h4>
                    <p className="text-sm text-muted-foreground">Point a custom domain at this app, or use the generated share URL below.</p>
                    <div className="flex gap-2">
                      <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="app.example.com" className="text-sm" aria-label="Custom domain" />
                      <Button onClick={handleSaveDomain} size="sm" disabled={!domainInput.trim() || isPending}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {workspace?.domains?.length ? workspace.domains.map((d) => (
                        <div key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm">{d.domain}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={d.verified ? "default" : "secondary"} className="gap-1">
                                {d.verified ? <CheckCircle2 className="size-3" /> : null}
                                {d.verified ? "Verified" : "Pending verification"}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)}>Remove</Button>
                            </div>
                          </div>
                          {!d.verified && (
                            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                              <p className="mb-1 font-medium text-foreground">Add these DNS records:</p>
                              <p className="font-mono">CNAME  {d.domain}  →  cname.chinnacoder.app</p>
                              <p className="mt-1">DNS changes can take up to 24 hours to propagate. Verification is checked automatically.</p>
                            </div>
                          )}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No custom domains yet.</p>}
                    </div>
                    <Button onClick={handlePublish} variant="outline" size="sm" disabled={!canAct || isPending}>Publish Share URL</Button>
                  </div>
                )}

                {settingsTab === "backups" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Backups</h4>
                    <p className="text-sm text-muted-foreground">Save a snapshot of the current files, or restore a previous one.</p>
                    <div className="flex gap-2">
                      <Input value={checkpointName} onChange={(e) => setCheckpointName(e.target.value)} placeholder="Backup name (optional)" className="text-sm" aria-label="Backup name" />
                      <Button onClick={handleCreateCheckpoint} size="sm" disabled={isPending}>Create backup</Button>
                    </div>
                    <div className="space-y-1.5">
                      {workspace?.checkpoints?.length ? workspace.checkpoints.map((cp) => (
                        <div key={cp.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{cp.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(cp.createdAt).toLocaleString()}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRestoreCheckpoint(cp.id)} disabled={isPending}>Restore</Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No backups yet.</p>}
                    </div>
                  </div>
                )}

                {settingsTab === "seo" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">SEO</h4>
                      <Badge variant="secondary">Coming soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Meta tags and social previews for this app. Not yet connected to the live build — safe to fill in ahead of launch.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-title" className="text-xs">Meta title</Label>
                      <Input id="seo-title" placeholder={appName} className="text-sm" disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-description" className="text-xs">Meta description</Label>
                      <Textarea id="seo-description" placeholder="A short description shown in search results and link previews." className="text-sm" disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-og" className="text-xs">Open Graph image</Label>
                      <Input id="seo-og" type="file" accept="image/*" className="text-sm" disabled />
                    </div>
                  </div>
                )}

                {settingsTab === "mcp" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">MCP Servers</h4>
                      <Badge variant="secondary">Coming soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Attach Model Context Protocol servers to this app so its AI features can call external tools. Not yet wired to a build.</p>
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No MCP servers configured for this app yet.
                    </div>
                  </div>
                )}

                {settingsTab === "ai-keys" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">AI API Keys</h4>
                    <p className="text-xs text-muted-foreground">Bring-your-own-key applies across your account for any chat using BYOK — not just this one.</p>
                    <div className="flex gap-2">
                      <Input value={byokKeyInput} onChange={(e) => setByokKeyInput(e.target.value)} type="password" placeholder="sk-or-..." className="text-sm" aria-label="OpenRouter API key" />
                      <Button onClick={handleSaveByokKey} size="sm" disabled={!byokKeyInput.trim() || isPending}>Save</Button>
                    </div>
                    <div className="space-y-1.5">
                      {byokKeys.length ? byokKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium capitalize">{k.provider}</p>
                            <p className="font-mono text-xs text-muted-foreground">{k.masked}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteByokKey(k.id)}>Remove</Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No keys stored yet.</p>}
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
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if (!open) setSettingsTab("vercel-project"); }}>
          <DialogContent className="overflow-hidden p-0 md:max-h-[580px] md:max-w-[780px] lg:max-w-[860px] flex flex-col md:flex-row">
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
                        { name: "Vercel Project", value: "vercel-project", icon: ExternalLink },
                        { name: "Integrations", value: "integrations", icon: Link },
                        { name: "Environment Variables", value: "environment-variables", icon: KeyRound },
                        { name: "AI API Keys", value: "ai-keys", icon: Plug },
                        { name: "GitHub", value: "github", icon: GitBranch },
                        { name: "Template", value: "template", icon: Boxes },
                        { name: "Domains", value: "domains", icon: Globe2 },
                        { name: "Backups", value: "backups", icon: History },
                        { name: "SEO", value: "seo", icon: Search },
                        { name: "MCP Servers", value: "mcp", icon: Server },
                        { name: "Analytics", value: "analytics", icon: BarChart3 },
                        { name: "Advanced", value: "advanced", icon: Lock },
                      ].map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={settingsTab === item.value}
                            onClick={() => setSettingsTab(item.value as any)}
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
                <Label className="sr-only" htmlFor="artifact-settings-tab-select">Artifact settings section</Label>
                <Select value={settingsTab} onValueChange={(value) => setSettingsTab(value as any)}>
                  <SelectTrigger id="artifact-settings-tab-select" className="flex-1 text-sm" aria-label="Artifact settings section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vercel-project">Vercel Project</SelectItem>
                    <SelectItem value="environment-variables">Environment Variables</SelectItem>
                    <SelectItem value="ai-keys">AI API Keys</SelectItem>
                    <SelectItem value="integrations">Integrations</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="domains">Domains</SelectItem>
                    <SelectItem value="backups">Backups</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="mcp">MCP Servers</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
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
                {settingsTab === "vercel-project" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-medium">{hasVercelProject ? "Vercel project connected" : "No Vercel project connected"}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{hasVercelProject ? "Project deployment metadata is tracked for this artifact." : "Create a tracked project record before external deployment is enabled."}</p>
                        </div>
                        <Button size="sm" onClick={async () => {
                          await workspaceRequest("update-project", { name: appName || chatTitle, description: appDescription });
                          await workspaceRequest("install-integration", { type: "vercel-project", config: { installed: true, projectName: appName || chatTitle } });
                          toast({ title: hasVercelProject ? "Vercel project refreshed" : "Vercel project created" });
                        }}>{hasVercelProject ? "Refresh" : "Create"}</Button>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border/70 p-4">
                      <Label className="text-xs" htmlFor="artifact-app-name">Project name</Label>
                      <Input id="artifact-app-name" type="text" value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="My app" aria-label="App name" />
                      <Label className="text-xs" htmlFor="artifact-app-description">Description</Label>
                      <Textarea id="artifact-app-description" value={appDescription} onChange={(event) => setAppDescription(event.target.value)} rows={3} placeholder="Describe this app" aria-label="App description" />
                      <Button onClick={async () => {
                        await workspaceRequest("update-project", { name: appName, description: appDescription });
                        toast({title: "Project settings saved"});
                      }} size="sm">Save Project</Button>
                    </div>
                  </div>
                )}

                {settingsTab === "template" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Template</h4>
                    <p className="text-sm text-muted-foreground">Build profile for this generated app.</p>
                    <div>
                      <Label>AI Model</Label>
                      <Select value={settingsModel} onValueChange={setSettingsModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zai-org/GLM-5.1">GLM 5.1</SelectItem>
                          <SelectItem value="openrouter/anthropic/claude-sonnet-4.5">ChinnaLLM Code</SelectItem>
                          <SelectItem value="openrouter/auto">ChinnaLLM Auto</SelectItem>
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
                    }} size="sm">Apply Template Settings</Button>
                  </div>
                )}

                {settingsTab === "analytics" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">Runtime analytics become available after the public share is published.</p>
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
                      <Input value={envKey} onChange={e => setEnvKey(e.target.value)} placeholder="KEY" className="text-sm" aria-label="Environment variable key" />
                      <Input value={envValue} onChange={e => setEnvValue(e.target.value)} placeholder="value" className="text-sm" aria-label="Environment variable value" />
                      <Button onClick={handleSaveEnv} size="sm" disabled={!envKey}>Save</Button>
                    </div>
                  </div>
                )}

                {settingsTab === "integrations" && (
                  <div className="space-y-4">
	                    <h4 className="font-medium">Integrations</h4>
	                    <p className="text-xs text-muted-foreground">Install services into this project and persist the required encrypted keys.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {EASY_INSTALL_INTEGRATIONS.map((integ) => {
	                        const isInstalled = !!workspace?.integrations?.some((i) => i.type === integ.type);
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
                                    <Label className="text-[10px]" htmlFor={`install-key-${integ.type}-${key}`}>{key}</Label>
                                    <Input id={`install-key-${integ.type}-${key}`} value={installKeys[key] || ''} onChange={e => setInstallKeys(p => ({...p, [key]: e.target.value}))} className="h-7 text-xs" placeholder="Enter key" aria-label={`${integ.label} ${key}`} />
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

                {settingsTab === "github" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">GitHub</h4>
                    <p className="text-sm text-muted-foreground">{workspace?.hasGithub ? "GitHub is connected for pull request creation." : "Connect GitHub before creating pull requests."}</p>
                    <Button onClick={handleConnectGithub} variant="outline" size="sm" disabled={isPending}>{workspace?.hasGithub ? "Reconnect GitHub" : "Connect GitHub"}</Button>
                  </div>
                )}

                {settingsTab === "domains" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Domains</h4>
                    <p className="text-sm text-muted-foreground">Point a custom domain at this app, or use the generated share URL below.</p>
                    <div className="flex gap-2">
                      <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="app.example.com" className="text-sm" aria-label="Custom domain" />
                      <Button onClick={handleSaveDomain} size="sm" disabled={!domainInput.trim() || isPending}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {workspace?.domains?.length ? workspace.domains.map((d) => (
                        <div key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm">{d.domain}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={d.verified ? "default" : "secondary"} className="gap-1">
                                {d.verified ? <CheckCircle2 className="size-3" /> : null}
                                {d.verified ? "Verified" : "Pending verification"}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)}>Remove</Button>
                            </div>
                          </div>
                          {!d.verified && (
                            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                              <p className="mb-1 font-medium text-foreground">Add these DNS records:</p>
                              <p className="font-mono">CNAME  {d.domain}  →  cname.chinnacoder.app</p>
                              <p className="mt-1">DNS changes can take up to 24 hours to propagate. Verification is checked automatically.</p>
                            </div>
                          )}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No custom domains yet.</p>}
                    </div>
                    <Button onClick={handlePublish} variant="outline" size="sm" disabled={!canAct || isPending}>Publish Share URL</Button>
                  </div>
                )}

                {settingsTab === "backups" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Backups</h4>
                    <p className="text-sm text-muted-foreground">Save a snapshot of the current files, or restore a previous one.</p>
                    <div className="flex gap-2">
                      <Input value={checkpointName} onChange={(e) => setCheckpointName(e.target.value)} placeholder="Backup name (optional)" className="text-sm" aria-label="Backup name" />
                      <Button onClick={handleCreateCheckpoint} size="sm" disabled={isPending}>Create backup</Button>
                    </div>
                    <div className="space-y-1.5">
                      {workspace?.checkpoints?.length ? workspace.checkpoints.map((cp) => (
                        <div key={cp.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{cp.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(cp.createdAt).toLocaleString()}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRestoreCheckpoint(cp.id)} disabled={isPending}>Restore</Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No backups yet.</p>}
                    </div>
                  </div>
                )}

                {settingsTab === "seo" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">SEO</h4>
                      <Badge variant="secondary">Coming soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Meta tags and social previews for this app. Not yet connected to the live build — safe to fill in ahead of launch.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-title" className="text-xs">Meta title</Label>
                      <Input id="seo-title" placeholder={appName} className="text-sm" disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-description" className="text-xs">Meta description</Label>
                      <Textarea id="seo-description" placeholder="A short description shown in search results and link previews." className="text-sm" disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="seo-og" className="text-xs">Open Graph image</Label>
                      <Input id="seo-og" type="file" accept="image/*" className="text-sm" disabled />
                    </div>
                  </div>
                )}

                {settingsTab === "mcp" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">MCP Servers</h4>
                      <Badge variant="secondary">Coming soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Attach Model Context Protocol servers to this app so its AI features can call external tools. Not yet wired to a build.</p>
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No MCP servers configured for this app yet.
                    </div>
                  </div>
                )}

                {settingsTab === "ai-keys" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">AI API Keys</h4>
                    <p className="text-xs text-muted-foreground">Bring-your-own-key applies across your account for any chat using BYOK — not just this one.</p>
                    <div className="flex gap-2">
                      <Input value={byokKeyInput} onChange={(e) => setByokKeyInput(e.target.value)} type="password" placeholder="sk-or-..." className="text-sm" aria-label="OpenRouter API key" />
                      <Button onClick={handleSaveByokKey} size="sm" disabled={!byokKeyInput.trim() || isPending}>Save</Button>
                    </div>
                    <div className="space-y-1.5">
                      {byokKeys.length ? byokKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium capitalize">{k.provider}</p>
                            <p className="font-mono text-xs text-muted-foreground">{k.masked}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteByokKey(k.id)}>Remove</Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No keys stored yet.</p>}
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
      )}
      {versions.length > 0 && (
        <Select value={activeMessageId || ""} onValueChange={(value) => onSwitchVersion(value)}>
          <SelectTrigger
            className="hidden h-7 max-w-[130px] gap-1 border-border bg-background px-2 text-xs text-foreground sm:flex"
            aria-label="Switch generated version"
          >
            <SelectValue placeholder="Version" />
          </SelectTrigger>
          <SelectContent>
            {versions.slice().reverse().map((version) => (
              <SelectItem key={version.id} value={version.id} className="text-xs">
                {version.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} aria-label="Upload project asset" />
      <Tip label="Upload asset"><button type="button" className={iconButton} onClick={() => uploadRef.current?.click()} aria-label="Upload asset"><Upload className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Export zip"><button type="button" className={iconButton} onClick={onDownload} disabled={!canAct} aria-label="Export generated files"><Download className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Share link"><button type="button" className={iconButton} onClick={handleShare} disabled={!activeMessageId} aria-label="Copy share link"><Share2 className="size-4" aria-hidden="true" /></button></Tip>
      <Tip label="Publish share"><button type="button" onClick={() => startTransition(() => { void handlePublish(); })} disabled={!canAct || isPending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45" aria-label="Publish share"><ExternalLink className="size-3.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" aria-hidden="true" /><span className="hidden lg:inline">Publish</span></button></Tip>
      {workspace?.hasGithub && <Tip label="Create pull request"><button type="button" className={iconButton} onClick={handleCreatePr} disabled={!canAct || isPending} aria-label="Create GitHub pull request"><GitPullRequest className="size-4" aria-hidden="true" /></button></Tip>}
      <Tip label="More project actions"><button ref={moreButtonRef} type="button" className={iconButton} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-controls={menuId} aria-label="More project actions"><MoreHorizontal className="size-4" aria-hidden="true" /></button></Tip>

      {open && (
        <div ref={menuRef} id={menuId} className="absolute right-0 top-10 z-50 w-[320px] overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/30">
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
            <button type="button" className={menuItem} onClick={handleSync} disabled={!canAct || isPending}><RefreshCw className="size-3.5" aria-hidden="true" /> Sync artifact files</button>
            <button type="button" className={menuItem} onClick={handleBootstrap} disabled={isPending}><RefreshCw className="size-3.5" aria-hidden="true" /> Reseed scaffold</button>
            <button type="button" className={menuItem} onClick={workspace?.hasGithub ? handleCreatePr : handleConnectGithub} disabled={isPending}><GitPullRequest className="size-3.5" aria-hidden="true" /> {workspace?.hasGithub ? "Create PR request" : "Connect GitHub"}</button>
            <button type="button" className={menuItem} onClick={() => { setOpen(false); setSettingsOpen(true); }} disabled={!canAct}><Settings className="size-3.5" aria-hidden="true" /> App Settings</button>
          </div>
          <div className="border-t border-border p-2"><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><KeyRound className="size-3" aria-hidden="true" /> Env vars</div><div className="grid grid-cols-[1fr_1fr_auto] gap-1"><Input value={envKey} onChange={(event) => setEnvKey(event.target.value)} placeholder="KEY" aria-label="Environment variable key" className="h-8 text-xs" /><Input value={envValue} onChange={(event) => setEnvValue(event.target.value)} placeholder="value" aria-label="Environment variable value" className="h-8 text-xs" /><Button type="button" variant="outline" size="sm" onClick={handleSaveEnv} disabled={!envKey.trim() || isPending} aria-label="Save environment variable" className="h-8 px-2 text-xs">Save</Button></div><div className="mt-2 max-h-24 space-y-1 overflow-auto">{workspace?.envVars?.length ? workspace.envVars.map((env) => <div key={env.id} className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1 text-[11px]"><span className="font-mono text-foreground">{env.key}</span><span className="text-muted-foreground">{env.value}</span></div>) : <p className="text-[11px] text-muted-foreground">No environment variables yet.</p>}</div></div>
        </div>
      )}
    </div>
  );
}
