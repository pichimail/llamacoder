"use client";

/** Admin analytics: real DB-backed lifetime totals + 30-day model/credit
 * usage breakdown. Reuses /api/admin/stats (lifetime counts) and
 * /api/admin/dashboard (30-day model/credit distribution) — both already
 * power other admin pages, so this page adds no new backend surface. */

import { useEffect, useState } from "react";
import { BarChart3, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatsData = {
  counts: { chats: number; messages: number; users: number };
  modelUsage: Array<{ model: string; count: number }>;
};

type DashboardData = {
  creditsByTier: Array<{ tier: string; credits: number }>;
  callsByModel: Array<{ model: string; calls: number }>;
};

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }).then((response) => (response.ok ? response.json() : Promise.reject())),
      fetch("/api/admin/dashboard", { cache: "no-store" }).then((response) => (response.ok ? response.json() : Promise.reject())),
    ])
      .then(([statsJson, dashboardJson]) => {
        if (cancelled) return;
        setStats(statsJson);
        setDashboard(dashboardJson);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: "Total chats", value: stats?.counts.chats, icon: BarChart3 },
    { label: "Total messages", value: stats?.counts.messages, icon: MessageSquare },
    { label: "Total users", value: stats?.counts.users, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">Lifetime totals and 30-day usage breakdown — live from the database.</p>
      </div>

      {failed ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load analytics data. Check admin access and database connectivity.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs">
                <stat.icon className="size-3.5" /> {stat.label}
              </CardDescription>
              {stats ? (
                <CardTitle className="text-4xl tabular-nums">{(stat.value ?? 0).toLocaleString()}</CardTitle>
              ) : (
                <Skeleton className="h-9 w-20" />
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top models</CardTitle>
          <CardDescription>Most used LLMs, all time (by chat count)</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          {stats === null ? (
            <Skeleton className="h-full w-full" />
          ) : stats.modelUsage.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No chats yet.</p>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3">
              {[...stats.modelUsage]
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((row) => {
                  const max = Math.max(...stats.modelUsage.map((item) => item.count), 1);
                  const width = Math.max(4, Math.round((row.count / max) * 100));
                  return (
                    <div key={row.model} className="grid grid-cols-[minmax(90px,220px)_1fr_44px] items-center gap-3 text-xs">
                      <span className="truncate text-muted-foreground">{row.model}</span>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-right tabular-nums">{row.count}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI model calls</CardTitle>
            <CardDescription className="text-xs">Last 30 days, via ChinnaLLM/BYOK</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {dashboard === null ? (
              <Skeleton className="h-full w-full" />
            ) : dashboard.callsByModel.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No AI usage yet.</p>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3">
                {dashboard.callsByModel.map((row) => {
                  const max = Math.max(...dashboard.callsByModel.map((item) => item.calls), 1);
                  const width = Math.max(4, Math.round((row.calls / max) * 100));
                  return (
                    <div key={row.model} className="grid grid-cols-[minmax(90px,180px)_1fr_44px] items-center gap-3 text-xs">
                      <span className="truncate text-muted-foreground">{row.model}</span>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-right tabular-nums">{row.calls}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Credit usage by tier</CardTitle>
            <CardDescription className="text-xs">Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {dashboard === null ? (
              <Skeleton className="h-full w-full" />
            ) : dashboard.creditsByTier.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No AI usage yet.</p>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3">
                {dashboard.creditsByTier.map((entry) => {
                  const max = Math.max(...dashboard.creditsByTier.map((item) => item.credits), 1);
                  const width = Math.max(4, Math.round((entry.credits / max) * 100));
                  return (
                    <div key={entry.tier} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">{entry.tier}</span>
                        <span className="tabular-nums text-muted-foreground">{entry.credits}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
