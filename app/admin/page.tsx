import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  Cpu,
  Database,
  Flag,
  GalleryVerticalEnd,
  Images,
  LayoutDashboard,
  LogIn,
  MessageSquare,
  Rocket,
  Shield,
  Users,
} from "lucide-react";

import { ADMIN_EMAIL, getAdminSession } from "@/lib/admin-auth";
import { MODELS } from "@/lib/constants";
import { getPrisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isRateLimitConfigured } from "@/lib/rate-limit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function getAdminStats() {
  const prisma = getPrisma();
  const [settings, chats, messages, users, recentChats, modelRows] = await Promise.all([
    getSettings(),
    prisma.chat.count().catch(() => 0),
    prisma.message.count().catch(() => 0),
    prisma.user.count().catch(() => 0),
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
  ]);

  return {
    settings,
    counts: { chats, messages, users },
    recentChats,
    modelUsage: modelRows.map((row) => ({
      model: row.model,
      count: row._count.model,
    })) as ModelUsage[],
    deploy: {
      provider: process.env.VERCEL ? "vercel" : "self-hosted",
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      googleAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      togetherConfigured: Boolean(process.env.TOGETHER_API_KEY),
      openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      braintrustConfigured: Boolean(process.env.BRAINTRUST_API_KEY),
      rateLimitConfigured: isRateLimitConfigured(),
    },
  };
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
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

function StatusCard({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <Badge variant={ready ? "default" : "outline"}>{ready ? "Ready" : "Missing"}</Badge>
    </div>
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
            <a href="/api/auth/signin/google">
              <LogIn className="size-4" />
              Sign in with Google
            </a>
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

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-[#1F2023] text-[#F4F4F5]">
        <SidebarHeader className="border-b border-white/8 bg-[#1F2023]/95 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="rounded-xl border border-white/8 bg-white/5">
                <Link href="/admin">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/10 text-white">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin</span>
                    <span className="truncate text-xs">{ADMIN_EMAIL}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-[#1F2023] px-0 py-2">
          <SidebarGroup>
            <SidebarGroupLabel>Console</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Overview">
                    <LayoutDashboard className="stroke-[1.8]" />
                    <span>Overview</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Braintrust logs">
                    <Link href="/admin/braintrust">
                      <Brain className="stroke-[1.8]" />
                      <span>Braintrust logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Gallery">
                    <Link href="/gallery">
                      <Images className="stroke-[1.8]" />
                      <span>Gallery</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/8 bg-[#1F2023]/95">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to app">
                <Link href="/">
                  <ArrowLeft className="stroke-[1.8]" />
                  <span>Back to app</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <ThemeToggle className="ml-2 mt-2 size-9 rounded-xl border border-white/8 bg-white/5 text-[#F4F4F5]/80" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 text-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <span className="font-semibold">Admin Console</span>
            <Badge variant={saasOn ? "default" : "outline"}>{saasOn ? "SaaS mode ON" : "Open mode"}</Badge>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/braintrust">
              <Brain className="size-3.5" />
              Logs
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Chats / Projects" value={stats.counts.chats} icon={MessageSquare} />
            <StatCard label="Messages" value={stats.counts.messages} icon={BarChart3} />
            <StatCard label="Users" value={stats.counts.users} icon={Users} />
            <StatCard label="Models" value={MODELS.filter((model) => !model.hidden).length} icon={Cpu} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Recent projects</CardTitle>
                <CardDescription>Latest app generations and chat workspaces.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border rounded-xl border border-border p-0 text-sm">
                {stats.recentChats.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No chats yet.</div>
                ) : (
                  stats.recentChats.map((chat) => (
                    <Link key={chat.id} href={`/chats/${chat.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-accent/50">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{chat.title || "Untitled"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{chat.model}</div>
                      </div>
                      <Badge variant="outline">Open</Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Rocket className="size-4" />Deployment</CardTitle>
                <CardDescription>Production readiness checks from environment variables.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatusCard label="Database" ready={stats.deploy.databaseConfigured} />
                <StatusCard label="Google OAuth" ready={stats.deploy.googleAuthConfigured} />
                <StatusCard label="Together AI" ready={stats.deploy.togetherConfigured} />
                <StatusCard label="OpenRouter" ready={stats.deploy.openrouterConfigured} />
                <StatusCard label="Blob storage" ready={stats.deploy.blobConfigured} />
                <StatusCard label="Upstash rate limit" ready={stats.deploy.rateLimitConfigured} />
                <StatusCard label="Braintrust" ready={stats.deploy.braintrustConfigured} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Flag className="size-4" />Feature flags</CardTitle>
                <CardDescription>Current app settings. Use API controls for mutation in this pass.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(stats.settings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                    <span>{key}</span>
                    <Badge variant={value === "on" ? "default" : "outline"}>{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

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
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
