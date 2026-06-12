"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Flag,
  Users,
  Cpu,
  Rocket,
  RefreshCw,
  LogOut,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Stats = {
  counts: { chats: number; messages: number; users: number };
  settings: Record<string, string>;
  recentChats: { id: string; title: string; model: string; createdAt: string }[];
  modelUsage: { model: string; count: number }[];
  modelCatalog: { label: string; value: string; hidden?: boolean }[];
  deploy: Record<string, any>;
};

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "users", label: "Users & Plans", icon: Users },
  { id: "models", label: "Model Catalog", icon: Cpu },
  { id: "deploy", label: "Deployment", icon: Rocket },
] as const;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
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
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [section, setSection] =
    useState<(typeof SECTIONS)[number]["id"]>("overview");
  const [refreshing, setRefreshing] = useState(false);

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

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Login failed",
          description: data?.error || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }
      await load();
    } finally {
      setLoggingIn(false);
    }
  };

  const setFlag = async (key: string, on: boolean) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: on ? "on" : "off" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        title: "Could not save",
        description: data?.error,
        variant: "destructive",
      });
      return;
    }
    const settings = await res.json();
    setStats((s) => (s ? { ...s, settings } : s));
    toast({ title: `${key} ${on ? "enabled" : "disabled"}` });
  };

  if (authed === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!authed) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background px-4 text-foreground">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-xl border border-border bg-card p-6"
          aria-label="Admin login"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="size-4" aria-hidden="true" /> Admin Console
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Demo credentials — ID: <code>admin</code> · Password:{" "}
            <code>123456</code>
          </p>
          <label className="mt-4 block text-xs text-muted-foreground">
            ID
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="mt-3 block text-xs text-muted-foreground">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            disabled={loggingIn || !id || !password}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loggingIn && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            Sign in
          </button>
        </form>
      </main>
    );
  }

  const s = stats!;
  const saasOn = s.settings.saasMode === "on";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex h-12 items-center justify-between border-b border-border px-4 text-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to Main
          </button>
          <span className="font-semibold">Admin Console</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${saasOn ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}
          >
            {saasOn ? "SaaS mode ON" : "Open free mode"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              setAuthed(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden="true" /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[200px_1fr] md:p-6">
        <nav aria-label="Admin sections" className="flex gap-2 overflow-x-auto md:flex-col">
          {SECTIONS.map(({ id: sid, label, icon: Icon }) => (
            <button
              key={sid}
              onClick={() => setSection(sid)}
              aria-current={section === sid ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                section === sid
                  ? "border-border bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        <div>
          {section === "overview" && (
            <section aria-label="Overview">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Chats / Projects" value={s.counts.chats} />
                <StatCard label="Messages" value={s.counts.messages} />
                <StatCard label="Users" value={s.counts.users} />
              </div>
              <h2 className="mt-6 text-sm font-medium">Recent projects</h2>
              <div className="mt-2 divide-y divide-border rounded-lg border border-border bg-card text-sm">
                {s.recentChats.length === 0 && (
                  <div className="p-4 text-xs text-muted-foreground">
                    No chats yet.
                  </div>
                )}
                {s.recentChats.map((c) => (
                  <a
                    key={c.id}
                    href={`/chats/${c.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-accent/50"
                  >
                    <span className="truncate">{c.title || "Untitled"}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {c.model.split("/").pop()}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {section === "flags" && (
            <section
              aria-label="Feature flags"
              className="rounded-lg border border-border bg-card px-4 py-1"
            >
              <FlagRow
                title="SaaS mode"
                description="Master switch. ON = authentication + SaaS features active. OFF = open free mode for anyone to build & test."
                value={saasOn}
                onChange={(v) => setFlag("saasMode", v)}
              />
              <FlagRow
                title="Google authentication"
                description="Show Google sign-in (requires GOOGLE_CLIENT_ID / SECRET env). Only visible when SaaS mode is ON."
                value={s.settings.googleAuth === "on"}
                onChange={(v) => setFlag("googleAuth", v)}
              />
              <FlagRow
                title="Public gallery"
                description="Enable the /gallery page listing community builds & templates."
                value={s.settings.gallery !== "off"}
                onChange={(v) => setFlag("gallery", v)}
              />
              <FlagRow
                title="Auto-fix by default"
                description="New builder sessions start with the self-correcting repair loop enabled."
                value={s.settings.autoFixDefault === "on"}
                onChange={(v) => setFlag("autoFixDefault", v)}
              />
            </section>
          )}

          {section === "users" && (
            <section aria-label="Users and plans">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Registered users" value={s.counts.users} />
                <StatCard label="Plan" value="free (default)" />
                <StatCard
                  label="Auth provider"
                  value={s.deploy.googleAuthConfigured ? "Google" : "not configured"}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Users are created automatically on first Google sign-in (SaaS
                mode). Run <code>npx prisma db push</code> once to create the
                User/Account/Session tables.
              </p>
            </section>
          )}

          {section === "models" && (
            <section aria-label="Model catalog">
              <div className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                {s.modelCatalog.map((m) => {
                  const usage =
                    s.modelUsage.find((u) => u.model === m.value)?.count ?? 0;
                  return (
                    <div
                      key={m.value}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <div>
                        <div className="font-medium">{m.label}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {m.value}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{usage} chats</span>
                        {m.hidden && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                            hidden
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {section === "deploy" && (
            <section aria-label="Deployment">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Provider" value={s.deploy.provider} />
                <StatCard label="Environment" value={s.deploy.env} />
                <StatCard
                  label="Database"
                  value={s.deploy.databaseConfigured ? "connected" : "missing"}
                />
                <StatCard
                  label="Together AI"
                  value={s.deploy.togetherConfigured ? "configured" : "missing"}
                />
                <StatCard
                  label="Google OAuth"
                  value={
                    s.deploy.googleAuthConfigured ? "configured" : "missing env"
                  }
                />
                <StatCard
                  label="Blob storage"
                  value={s.deploy.blobConfigured ? "configured" : "missing"}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
