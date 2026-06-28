"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Flag,
  Users,
  Cpu,
  Rocket,
  RefreshCw,
  LogIn,
  ArrowLeft,
  Pin,
  Trash2,
  GalleryVerticalEnd,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";

type Stats = {
  counts: { chats: number; messages: number; users: number };
  settings: Record<string, string>;
  recentChats: { id: string; title: string; model: string; createdAt: string }[];
  modelUsage: { model: string; count: number }[];
  modelCatalog: { label: string; value: string; hidden?: boolean }[];
  deploy: Record<string, any>;
};

const ADMIN_EMAIL = "pichimail24@gmail.com";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "users", label: "Users & Plans", icon: Users },
  { id: "models", label: "Model Catalog", icon: Cpu },
  { id: "featured", label: "Featured", icon: Pin },
  { id: "deploy", label: "Deployment", icon: Rocket },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type FeaturedCandidate = {
  messageId: string;
  chatId: string;
  title: string;
  prompt: string;
  model: string;
  fileCount: number;
};

type FeaturedPinRow = {
  pinId?: string;
  slug: string;
  title: string;
  messageId?: string;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function FlagRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section") as SectionId | null;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [section, setSection] = useState<SectionId>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [featuredPins, setFeaturedPins] = useState<FeaturedPinRow[]>([]);
  const [featuredCandidates, setFeaturedCandidates] = useState<FeaturedCandidate[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  useEffect(() => {
    if (requestedSection && SECTIONS.some((item) => item.id === requestedSection)) {
      setSection(requestedSection);
    }
  }, [requestedSection]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      setStats(await res.json());
      setAuthed(true);
    } catch {
      toast({ title: "Failed to load stats", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadFeatured = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const res = await fetch("/api/admin/featured", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setFeaturedPins(data.pins ?? []);
      setFeaturedCandidates(data.candidates ?? []);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && section === "featured") {
      loadFeatured();
    }
  }, [authed, section, loadFeatured]);

  const pinFeatured = async (messageId: string) => {
    const res = await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Could not pin", description: data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Pinned to featured gallery" });
    await loadFeatured();
  };

  const unpinFeatured = async (id: string) => {
    const res = await fetch(`/api/admin/featured?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Could not unpin", variant: "destructive" });
      return;
    }
    toast({ title: "Removed from featured" });
    await loadFeatured();
  };

  const setFlag = async (key: string, on: boolean) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: on ? "on" : "off" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Could not save", description: data?.error, variant: "destructive" });
      return;
    }
    const settings = await res.json();
    setStats((s) => (s ? { ...s, settings } : s));
    toast({ title: `${key} ${on ? "enabled" : "disabled"}` });
  };

  const activeSection = useMemo(() => SECTIONS.find((item) => item.id === section), [section]);

  if (authed === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-foreground">
        <RefreshCw className="size-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!authed) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-background">
            <Shield className="size-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">Admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin dashboard is restricted to Google account <span className="font-medium text-foreground">{ADMIN_EMAIL}</span>.
          </p>
          <a
            href="/api/auth/signin/google"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Sign in with Google
          </a>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to app
          </button>
        </div>
      </main>
    );
  }

  const s = stats!;
  const saasOn = s.settings.saasMode === "on";

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-[#1F2023] text-[#F4F4F5]">
        <SidebarHeader className="border-b border-white/8 bg-[#1F2023]/95 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="rounded-xl border border-white/8 bg-white/5">
                <a href="/admin">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/10 text-white">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin</span>
                    <span className="truncate text-xs">{ADMIN_EMAIL}</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-[#1F2023] px-0 py-2">
          <SidebarGroup>
            <SidebarGroupLabel>Console</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={section === id}
                      tooltip={label}
                      onClick={() => setSection(id)}
                      className="rounded-xl transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white"
                    >
                      <Icon className="stroke-[1.8]" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/8 bg-[#1F2023]/95">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to app">
                <a href="/">
                  <ArrowLeft className="stroke-[1.8]" />
                  <span>Back to app</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sign out">
                <a href="/api/auth/signout">
                  <LogIn className="rotate-180 stroke-[1.8]" />
                  <span>Sign out</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <ThemeToggle className="ml-2 mt-2 size-9 rounded-xl border border-white/8 bg-white/5 text-[#F4F4F5]/80" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-dvh bg-background text-foreground">
        <header className="flex h-12 items-center justify-between border-b border-border px-4 text-sm">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <span className="font-semibold">{activeSection?.label ?? "Admin Console"}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${saasOn ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
              {saasOn ? "SaaS mode ON" : "Open free mode"}
            </span>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
          {section === "overview" && (
            <section aria-label="Overview">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Chats / Projects" value={s.counts.chats} />
                <StatCard label="Messages" value={s.counts.messages} />
                <StatCard label="Users" value={s.counts.users} />
              </div>
              <h2 className="mt-6 text-sm font-medium">Recent projects</h2>
              <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">
                {s.recentChats.length === 0 && <div className="p-4 text-xs text-muted-foreground">No chats yet.</div>}
                {s.recentChats.map((c) => (
                  <a key={c.id} href={`/chats/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-accent/50">
                    <span className="truncate">{c.title || "Untitled"}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{c.model.split("/").pop()}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {section === "flags" && (
            <section aria-label="Feature flags" className="rounded-xl border border-border bg-card px-4 py-1">
              <FlagRow title="SaaS mode" description="ON = authentication and SaaS features active." value={saasOn} onChange={(v) => setFlag("saasMode", v)} />
              <FlagRow title="Google authentication" description="Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." value={s.settings.googleAuth === "on"} onChange={(v) => setFlag("googleAuth", v)} />
              <FlagRow title="Public gallery" description="Enable the /gallery page." value={s.settings.gallery !== "off"} onChange={(v) => setFlag("gallery", v)} />
              <FlagRow title="Auto-fix by default" description="Start builder sessions with repair loop enabled." value={s.settings.autoFixDefault === "on"} onChange={(v) => setFlag("autoFixDefault", v)} />
            </section>
          )}

          {section === "users" && (
            <section aria-label="Users and plans">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Registered users" value={s.counts.users} />
                <StatCard label="Admin email" value={ADMIN_EMAIL} />
                <StatCard label="Auth provider" value={s.deploy.googleAuthConfigured ? "Google" : "not configured"} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Users are created automatically on first Google sign-in. Only {ADMIN_EMAIL} can access this console.</p>
            </section>
          )}

          {section === "featured" && (
            <section aria-label="Featured pinning">
              <p className="text-sm text-muted-foreground">Pin generated apps to the gallery.</p>
              {featuredLoading ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" /> Loading featured pins…</div>
              ) : (
                <>
                  <h2 className="mt-6 text-sm font-medium">Pinned apps</h2>
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">
                    {featuredPins.length === 0 ? <div className="p-4 text-xs text-muted-foreground">No pinned apps yet.</div> : featuredPins.map((pin) => (
                      <div key={pin.pinId ?? pin.slug} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <div className="min-w-0"><div className="truncate font-medium">{pin.title}</div><div className="font-mono text-[11px] text-muted-foreground">/id/{pin.slug}</div></div>
                        <div className="flex shrink-0 items-center gap-2"><a href={`/id/${pin.slug}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">Preview</a>{pin.pinId ? <button type="button" onClick={() => unpinFeatured(pin.pinId!)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3" /> Unpin</button> : null}</div>
                      </div>
                    ))}
                  </div>
                  <h2 className="mt-6 text-sm font-medium">Recent generations</h2>
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">
                    {featuredCandidates.length === 0 ? <div className="p-4 text-xs text-muted-foreground">No pin candidates yet.</div> : featuredCandidates.map((candidate) => (
                      <div key={candidate.messageId} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <div className="min-w-0"><div className="truncate font-medium">{candidate.title}</div><div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{candidate.prompt}</div><div className="mt-1 font-mono text-[11px] text-muted-foreground">{candidate.model.split("/").pop()} · {candidate.fileCount} files</div></div>
                        <div className="flex shrink-0 items-center gap-2"><a href={`/chats/${candidate.chatId}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">Open chat</a><button type="button" onClick={() => pinFeatured(candidate.messageId)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"><Pin className="size-3" /> Pin</button></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {section === "models" && (
            <section aria-label="Model catalog">
              <div className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
                {s.modelCatalog.map((m) => {
                  const usage = s.modelUsage.find((u) => u.model === m.value)?.count ?? 0;
                  return <div key={m.value} className="flex items-center justify-between gap-4 px-4 py-2.5"><div><div className="font-medium">{m.label}</div><div className="font-mono text-[11px] text-muted-foreground">{m.value}</div></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{usage} chats</span>{m.hidden && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">hidden</span>}</div></div>;
                })}
              </div>
            </section>
          )}

          {section === "deploy" && (
            <section aria-label="Deployment">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Provider" value={s.deploy.provider} />
                <StatCard label="Environment" value={s.deploy.env} />
                <StatCard label="Database" value={s.deploy.databaseConfigured ? "connected" : "missing"} />
                <StatCard label="Together AI" value={s.deploy.togetherConfigured ? "configured" : "missing"} />
                <StatCard label="Google OAuth" value={s.deploy.googleAuthConfigured ? "configured" : "missing env"} />
                <StatCard label="Blob storage" value={s.deploy.blobConfigured ? "configured" : "missing"} />
              </div>
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
