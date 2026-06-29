import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarClock,
  Cpu,
  Database,
  GalleryVerticalEnd,
  Images,
  KeyRound,
  MessageSquare,
  Rocket,
  ServerCog,
  Shield,
  Users,
} from "lucide-react";

import { ADMIN_EMAIL, getAdminSession } from "@/lib/admin-auth";
import { MODELS } from "@/lib/constants";
import { getPrisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isRateLimitConfigured } from "@/lib/rate-limit";
import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import ThemeToggle from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SettingValue = "on" | "off";
type AdminSettings = {
  saasMode: SettingValue;
  googleAuth: SettingValue;
  gallery: SettingValue;
  autoFixDefault: SettingValue;
};

type RecentChat = {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
};

type ModelUsage = {
  model: string;
  count: number;
};

function asSettingValue(value: string | undefined): SettingValue {
  return value === "off" ? "off" : "on";
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getAdminStats() {
  const prisma = getPrisma();
  const [
    settingsRaw,
    chats,
    messages,
    users,
    projects,
    deployments,
    envVars,
    shareLinks,
    featuredPins,
    recentChats,
    modelRows,
    userRows,
    planRows,
    roleRows,
    projectRows,
    featuredRows,
    shareRows,
  ] = await Promise.all([
    getSettings(),
    prisma.chat.count().catch(() => 0),
    prisma.message.count().catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.project.count().catch(() => 0),
    prisma.deployment.count().catch(() => 0),
    prisma.environmentVariable.count().catch(() => 0),
    prisma.shareLink.count().catch(() => 0),
    prisma.featuredPin.count().catch(() => 0),
    prisma.chat
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, model: true, createdAt: true },
      })
      .catch(() => [] as RecentChat[]),
    prisma.chat
      .groupBy({ by: ["model"], _count: { model: true } })
      .catch(() => [] as { model: string; _count: { model: number } }[]),
    prisma.user
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          role: true,
          createdAt: true,
          _count: { select: { projects: true, sessions: true } },
        },
      })
      .catch(() => []),
    prisma.user
      .groupBy({ by: ["plan"], _count: { plan: true } })
      .catch(() => [] as { plan: string; _count: { plan: number } }[]),
    prisma.user
      .groupBy({ by: ["role"], _count: { role: true } })
      .catch(() => [] as { role: string; _count: { role: number } }[]),
    prisma.project
      .findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
          _count: { select: { files: true, chats: true, deployments: true, shareLinks: true } },
        },
      })
      .catch(() => []),
    prisma.featuredPin
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, slug: true, title: true, messageId: true, createdAt: true },
      })
      .catch(() => []),
    prisma.shareLink
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          token: true,
          isPublic: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
        },
      })
      .catch(() => []),
  ]);

  const settings: AdminSettings = {
    saasMode: asSettingValue(settingsRaw.saasMode),
    googleAuth: asSettingValue(settingsRaw.googleAuth),
    gallery: asSettingValue(settingsRaw.gallery),
    autoFixDefault: asSettingValue(settingsRaw.autoFixDefault),
  };

  return {
    settings,
    counts: { chats, messages, users, projects, deployments, envVars, shareLinks, featuredPins },
    recentChats,
    users: userRows,
    projects: projectRows,
    featuredPins: featuredRows,
    shareLinks: shareRows,
    planUsage: planRows.map((row) => ({ label: row.plan || "free", count: row._count.plan })),
    roleUsage: roleRows.map((row) => ({ label: row.role || "user", count: row._count.role })),
    modelUsage: modelRows.map((row) => ({ model: row.model, count: row._count.model })) as ModelUsage[],
    deploy: {
      provider: process.env.VERCEL ? "vercel" : "self-hosted",
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      googleAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      authSecretConfigured: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      togetherConfigured: Boolean(process.env.TOGETHER_API_KEY),
      openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      braintrustConfigured: Boolean(process.env.BRAINTRUST_API_KEY),
      upstashConfigured: isRateLimitConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
      codesandboxConfigured: Boolean(process.env.CSB_API_KEY),
    },
  };
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Icon className="size-5" />
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function StatusCard({ label, ready, hint }: { label: string; ready: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {hint ? <div className="truncate font-mono text-[10px] text-muted-foreground">{hint}</div> : null}
      </div>
      <Badge variant={ready ? "default" : "outline"}>{ready ? "Ready" : "Missing"}</Badge>
    </div>
  );
}

function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-[140px] rounded-xl border-0 bg-transparent">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function AdminDenied({ authError = false }: { authError?: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-sm rounded-2xl text-center">
        <CardHeader>
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-background">
            <Shield className="size-5" />
          </div>
          <CardTitle className="mt-3">Admin access</CardTitle>
          <CardDescription>
            {authError
              ? "Authentication configuration needs attention. Check Google OAuth and NextAuth environment variables."
              : `Only ${ADMIN_EMAIL} can access this console.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">
              <Shield className="size-4" />
              Sign in with Google
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to app
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function AdminPage() {
  let session = null;
  try {
    session = await getAdminSession();
  } catch {
    return <AdminDenied authError />;
  }

  if (!session) return <AdminDenied />;

  const stats = await getAdminStats();
  const saasOn = stats.settings.saasMode === "on";
  const visibleModelCount = MODELS.filter((model) => !model.hidden).length;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
              <GalleryVerticalEnd className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Admin Console</span>
              <span className="block truncate text-xs text-muted-foreground">{ADMIN_EMAIL}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Admin navigation">
            <Button asChild variant="ghost" size="sm"><Link href="/admin">Overview</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/braintrust">Braintrust logs</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/gallery">Gallery</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant={saasOn ? "default" : "outline"}>{saasOn ? "SaaS ON" : "Open"}</Badge>
            <ThemeToggle className="border-border bg-muted/40 text-foreground" />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/">
                <ArrowLeft className="size-3.5" />
                App
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Chats" value={stats.counts.chats} icon={MessageSquare} />
          <StatCard label="Users" value={stats.counts.users} icon={Users} />
          <StatCard label="Projects" value={stats.counts.projects} icon={GalleryVerticalEnd} />
          <StatCard label="Models" value={visibleModelCount} icon={Cpu} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Recent projects</CardTitle>
              <CardDescription>Latest app generations and chat workspaces.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border rounded-xl border border-border p-0 text-sm">
              {stats.recentChats.length === 0 ? (
                <EmptyList title="No chats yet" description="Generated chats and projects will appear here." />
              ) : (
                stats.recentChats.map((chat) => (
                  <Link key={chat.id} href={`/chats/${chat.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-accent/50">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{chat.title || "Untitled"}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{chat.model}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(chat.createdAt)}</span>
                      <Badge variant="outline">Open</Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Rocket className="size-4" />Runtime and API keys</CardTitle>
              <CardDescription>Environment readiness. Secret values are never exposed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusCard label="Database" ready={stats.deploy.databaseConfigured} hint="DATABASE_URL" />
              <StatusCard label="Auth secret" ready={stats.deploy.authSecretConfigured} hint="AUTH_SECRET / NEXTAUTH_SECRET" />
              <StatusCard label="Google OAuth" ready={stats.deploy.googleAuthConfigured} hint="GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET" />
              <StatusCard label="Together AI" ready={stats.deploy.togetherConfigured} hint="TOGETHER_API_KEY" />
              <StatusCard label="OpenRouter" ready={stats.deploy.openrouterConfigured} hint="OPENROUTER_API_KEY" />
              <StatusCard label="Blob storage" ready={stats.deploy.blobConfigured} hint="BLOB_READ_WRITE_TOKEN" />
              <StatusCard label="Upstash rate limit" ready={stats.deploy.upstashConfigured} hint="UPSTASH_REDIS_REST_URL + TOKEN" />
              <StatusCard label="Braintrust" ready={stats.deploy.braintrustConfigured} hint="BRAINTRUST_API_KEY" />
              <StatusCard label="GitHub PR export" ready={stats.deploy.githubConfigured} hint="GITHUB_TOKEN / GH_TOKEN" />
              <StatusCard label="CodeSandbox export" ready={stats.deploy.codesandboxConfigured} hint="CSB_API_KEY" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <AdminSettingsPanel settings={stats.settings} />

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" />Users and plans</CardTitle>
              <CardDescription>Recent users, role distribution and active plan mix.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Plans</div>
                  <div className="mt-2 space-y-1.5">
                    {stats.planUsage.length === 0 ? <span className="text-xs text-muted-foreground">No plan data.</span> : stats.planUsage.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{row.label}</span>
                        <Badge variant="secondary">{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Roles</div>
                  <div className="mt-2 space-y-1.5">
                    {stats.roleUsage.length === 0 ? <span className="text-xs text-muted-foreground">No role data.</span> : stats.roleUsage.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{row.label}</span>
                        <Badge variant="secondary">{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {stats.users.length === 0 ? (
                  <EmptyList title="No users yet" description="SaaS-mode users will appear after sign-in." />
                ) : (
                  stats.users.map((user) => (
                    <div key={user.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{user.name || user.email || "Unnamed user"}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email || "No email"}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{user.plan}</Badge>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        <span>{user._count.projects} projects</span>
                        <span>{user._count.sessions} sessions</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ServerCog className="size-4" />Content and projects</CardTitle>
              <CardDescription>Generated project inventory, files, deployments and share links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-4">
                <StatusCard label="Messages" ready={stats.counts.messages > 0} hint={String(stats.counts.messages)} />
                <StatusCard label="Deployments" ready={stats.counts.deployments > 0} hint={String(stats.counts.deployments)} />
                <StatusCard label="Env vars" ready={stats.counts.envVars > 0} hint={String(stats.counts.envVars)} />
                <StatusCard label="Share links" ready={stats.counts.shareLinks > 0} hint={String(stats.counts.shareLinks)} />
              </div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {stats.projects.length === 0 ? (
                  <EmptyList title="No project inventory" description="Projects will appear after chats are linked to workspaces." />
                ) : (
                  stats.projects.map((project) => (
                    <Link key={project.id} href={`/chats?project=${project.id}`} className="block px-4 py-3 text-sm transition hover:bg-accent/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{project.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{project.user?.email || project.user?.name || "Local workspace"}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(project.updatedAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{project._count.files} files</Badge>
                        <Badge variant="secondary">{project._count.chats} chats</Badge>
                        <Badge variant="secondary">{project._count.deployments} deploys</Badge>
                        <Badge variant="secondary">{project._count.shareLinks} shares</Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Images className="size-4" />Gallery moderation</CardTitle>
              <CardDescription>Pinned templates and public share links used by the gallery.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Featured pins</div>
                <div className="divide-y divide-border">
                  {stats.featuredPins.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">No featured pins.</div>
                  ) : (
                    stats.featuredPins.map((pin) => (
                      <div key={pin.id} className="px-3 py-2 text-sm">
                        <div className="truncate font-medium">{pin.title}</div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">{pin.slug}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Share links</div>
                <div className="divide-y divide-border">
                  {stats.shareLinks.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">No share links.</div>
                  ) : (
                    stats.shareLinks.map((share) => (
                      <div key={share.id} className="px-3 py-2 text-sm">
                        <div className="truncate font-medium">{share.project.name}</div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="truncate font-mono">{share.token.slice(0, 8)}…</span>
                          <Badge variant={share.isPublic ? "default" : "outline"}>{share.isPublic ? "Public" : "Private"}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4" />Model usage</CardTitle>
              <CardDescription>Model distribution across generated projects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.modelUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No model usage yet.</p>
              ) : (
                stats.modelUsage.map((row) => (
                  <div key={row.model} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-mono text-xs">{row.model}</span>
                    <Badge variant="secondary">{row.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" />Production audit notes</CardTitle>
              <CardDescription>Operational checks for this admin surface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border px-3 py-2">Runtime secrets are shown only as configured/missing flags. Values are never rendered.</div>
              <div className="rounded-xl border border-border px-3 py-2">Feature flags mutate through the protected admin settings API.</div>
              <div className="rounded-xl border border-border px-3 py-2">User and project tables are read-only here to avoid destructive accidental actions.</div>
              <div className="rounded-xl border border-border px-3 py-2">Deployment provider: {stats.deploy.provider} · environment: {stats.deploy.env}</div>
              <div className="rounded-xl border border-border px-3 py-2"><CalendarClock className="mr-2 inline size-3.5" /> Refreshed from server on page load.</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
