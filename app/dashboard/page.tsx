import Link from "next/link";
import { ArrowUpRight, CreditCard, FolderKanban, MessageSquare, Settings2, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getCurrentUserOrNull } from "@/lib/authz";
import { getBalance } from "@/lib/chinnallm/credits";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUserOrNull();

  if (!user) {
    return (
      <main className="emerald-glass-theme min-h-dvh px-4 py-8 text-foreground md:px-8">
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden rounded-3xl">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
              <div>
                <Badge className="rounded-full border-emerald-400/25 bg-emerald-400/10 text-emerald-200">Workspace dashboard</Badge>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Sign in to manage your builds</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Your dashboard connects projects, chats, credits, saved settings, and publishing routes once authentication is active.
                </p>
              </div>
              <div className="flex items-end">
                <Button asChild className="rounded-xl"><Link href="/api/auth/signin">Sign in</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const prisma = getPrisma();
  const [projects, recentChats, balance] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: { select: { chats: true, members: true, deployments: true } },
      },
    }),
    prisma.chat.findMany({
      where: {
        isArchived: false,
        project: {
          OR: [
            { userId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, prompt: true, model: true, updatedAt: true, project: { select: { name: true } } },
    }),
    getBalance(user.id).catch(() => null),
  ]);

  const totalChats = projects.reduce((sum, project) => sum + project._count.chats, 0);
  const totalMembers = projects.reduce((sum, project) => sum + project._count.members, 0);
  const totalDeployments = projects.reduce((sum, project) => sum + project._count.deployments, 0);

  return (
    <main className="emerald-glass-theme min-h-dvh px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="glass-surface overflow-hidden rounded-3xl">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                <Sparkles className="size-3.5" /> User dashboard
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage projects, resume recent chats, tune builder defaults, and track ChinnaLLM credits from one responsive workspace.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button asChild variant="outline" className="rounded-xl border-emerald-400/25 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-100"><Link href="/settings"><Settings2 className="size-4" />Settings</Link></Button>
              <Button asChild className="rounded-xl bg-emerald-400 text-emerald-950 shadow-[0_0_28px_rgba(52,211,153,0.25)] hover:bg-emerald-300"><Link href="/"><Sparkles className="size-4" />New build</Link></Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={FolderKanban} label="Projects" value={projects.length} href="/chats" />
          <MetricCard icon={MessageSquare} label="Chats" value={totalChats} href="/chats" />
          <MetricCard icon={Users} label="Members" value={totalMembers} href="/chats" />
          <MetricCard icon={CreditCard} label="Credits left" value={balance?.balance ?? 0} href="/credits" />
          <MetricCard icon={ArrowUpRight} label="Deployments" value={totalDeployments} href="/gallery" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Recent projects</CardTitle>
              <CardDescription>Open a project workspace or continue from its latest chats.</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <FolderKanban className="mx-auto size-8 text-muted-foreground" />
                    <EmptyTitle>No projects yet</EmptyTitle>
                    <EmptyDescription>Start a build from the home page and it will appear here automatically.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`} className="glass-surface glass-interactive group rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-medium">{project.name}</h2>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description || "Workspace ready for chats, files, and deployments."}</p>
                        </div>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-emerald-300" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full border-emerald-400/20 text-emerald-200/80">{project._count.chats} chats</Badge>
                        <Badge variant="outline" className="rounded-full border-emerald-400/20 text-emerald-200/80">{project._count.members} members</Badge>
                        <span className="ml-auto">{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Workspace controls</CardTitle>
              <CardDescription>Direct routes into the live app controls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="h-11 justify-between rounded-xl"><Link href="/settings">Builder settings <ArrowUpRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="h-11 justify-between rounded-xl"><Link href="/credits">Credits and BYOK <ArrowUpRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="h-11 justify-between rounded-xl"><Link href="/gallery">Gallery <ArrowUpRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="h-11 justify-between rounded-xl"><Link href="/chats">Chat control center <ArrowUpRight className="size-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Recent chats</CardTitle>
            <CardDescription>Resume active app generations without digging through the sidebar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {recentChats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No active chats yet.</p>
            ) : recentChats.map((chat) => (
              <Link key={chat.id} href={`/chats/${chat.id}`} className="glass-surface glass-interactive grid gap-2 rounded-2xl p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{chat.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{chat.prompt}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:justify-end">
                  <Badge className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-200">{chat.project?.name || "Project"}</Badge>
                  <span>{chat.model}</span>
                  <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="glass-surface glass-interactive group block rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300 transition group-hover:bg-emerald-400/20"><Icon className="size-4" /></div>
        <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-emerald-300" />
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}
