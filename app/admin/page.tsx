"use client";

/** Admin dashboard home (Phase 4): real DB stats, charts, recent activity. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CreditCard, FolderKanban, MoreHorizontal, Rocket, Settings2, Tags, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DashboardData = {
  stats: { totalUsers: number; appsToday: number; activeToday: number; creditsToday: number };
  appsPerDay: Array<{ date: string; count: number }>;
  creditsByTier: Array<{ tier: string; credits: number }>;
  callsByModel: Array<{ model: string; calls: number }>;
  recentActivity: Array<{ id: string; title: string; promptPreview: string; model: string; user: string; status: string; createdAt: string }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const statCards = [
    { label: "Total Users", value: data?.stats.totalUsers, icon: Users },
    { label: "Apps Built Today", value: data?.stats.appsToday, icon: Rocket },
    { label: "Active Sessions", value: data?.stats.activeToday, icon: Activity },
    { label: "Credits Consumed Today", value: data?.stats.creditsToday, icon: CreditCard },
  ];
  const routeCards = [
    { href: "/admin/projects", label: "Projects", description: "Inspect projects, owners, chats, deployments, and workspace health.", icon: FolderKanban },
    { href: "/admin/users", label: "Users", description: "Search users, grant credits, change plans, and revoke BYOK keys.", icon: Users },
    { href: "/admin/pricing", label: "Plans", description: "Tune pricing, monthly grants, features, and credit bundles.", icon: Tags },
    { href: "/admin/settings", label: "Settings", description: "Switch SaaS, auth, gallery, and auto-fix defaults.", icon: Settings2 },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview — live data from the database.</p>
      </div>

      {failed ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Could not load dashboard data. Check admin access and database connectivity.</CardContent></Card>
      ) : null}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <stat.icon className="size-3.5" /> {stat.label}
              </CardDescription>
              {data ? (
                <CardTitle className="text-3xl tabular-nums">{(stat.value ?? 0).toLocaleString()}</CardTitle>
              ) : (
                <Skeleton className="h-9 w-20" />
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {routeCards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/45 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl border border-border bg-background p-2 text-muted-foreground transition group-hover:text-primary">
                <card.icon className="size-4" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <h2 className="mt-4 font-semibold">{card.label}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Apps built per day</CardTitle>
            <CardDescription className="text-xs">Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data ? (
              <div className="flex h-full items-end gap-1 rounded-xl border border-border/60 bg-muted/20 p-3">
                {data.appsPerDay.map((row) => {
                  const max = Math.max(...data.appsPerDay.map((item) => item.count), 1);
                  const height = Math.max(6, Math.round((row.count / max) * 100));
                  return (
                    <div key={row.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div title={`${row.date}: ${row.count}`} className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${height}%` }} />
                      <span className="hidden text-[9px] text-muted-foreground sm:block">{row.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Credit usage by tier</CardTitle>
            <CardDescription className="text-xs">Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data ? (
              data.creditsByTier.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No AI usage yet</p>
              ) : (
                <div className="flex h-full flex-col justify-center gap-3">
                  {data.creditsByTier.map((entry) => {
                    const max = Math.max(...data.creditsByTier.map((item) => item.credits), 1);
                    const width = Math.max(4, Math.round((entry.credits / max) * 100));
                    return (
                      <div key={entry.tier} className="space-y-1">
                        <div className="flex items-center justify-between text-xs"><span className="capitalize">{entry.tier}</span><span className="tabular-nums text-muted-foreground">{entry.credits}</span></div>
                        <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <Skeleton className="h-full w-full rounded-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI model usage distribution</CardTitle>
          <CardDescription className="text-xs">Calls per model, last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          {data ? (
            data.callsByModel.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No AI usage yet</p>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3">
                {data.callsByModel.map((row) => {
                  const max = Math.max(...data.callsByModel.map((item) => item.calls), 1);
                  const width = Math.max(4, Math.round((row.calls / max) * 100));
                  return (
                    <div key={row.model} className="grid grid-cols-[minmax(90px,180px)_1fr_44px] items-center gap-3 text-xs">
                      <span className="truncate text-muted-foreground">{row.model}</span>
                      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div>
                      <span className="text-right tabular-nums">{row.calls}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription className="text-xs">Last 20 generations</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data === null ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : data.recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No generations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentActivity.map((row) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="max-w-[140px] truncate text-sm">{row.user}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">{row.promptPreview || row.title}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{row.model}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "ready" ? "secondary" : "outline"} className="rounded-full text-[10px]">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={`Actions for ${row.title}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Generation</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/chats/${row.id}`}><ArrowUpRight className="size-4" />Open chat</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/projects?search=${encodeURIComponent(row.title || row.promptPreview)}`}><FolderKanban className="size-4" />Find project</Link>
                          </DropdownMenuItem>
                          {row.user && row.user !== "—" ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users?search=${encodeURIComponent(row.user)}`}><Users className="size-4" />Find user</Link>
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
