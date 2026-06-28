import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, BarChart3, Brain, ExternalLink, Gauge, RefreshCw } from "lucide-react";

import { getAdminSession } from "@/lib/admin-auth";
import { getGenerationLogDashboard } from "@/lib/generation-observability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function providerFromModel(model: string, provider?: string | null) {
  if (provider) return provider;
  if (model.startsWith("openrouter/")) return "OpenRouter";
  if (model.toLowerCase().includes("glm") || model.toLowerCase().includes("zai")) return "Together";
  return "Provider";
}

function scoreText(scores: Record<string, number> | null) {
  if (!scores) return "—";
  const entries = Object.entries(scores).filter(([, value]) => typeof value === "number");
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${Number(value).toFixed(2)}`).join(" · ");
}

function avgScore(logs: Awaited<ReturnType<typeof getGenerationLogDashboard>>["logs"]) {
  const values = logs.flatMap((log) =>
    Object.values(log.scores || {}).filter((value): value is number => typeof value === "number"),
  );
  if (values.length === 0) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
}

export default async function BraintrustAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin");

  const params = await searchParams;
  const dashboard = await getGenerationLogDashboard({ model: params.model, limit: 120 });
  const latest = dashboard.logs[0];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/admin" aria-label="Back to admin">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Braintrust Logs</h1>
            <p className="truncate text-xs text-muted-foreground">Quality, debugging and model comparison</p>
          </div>
          <Badge variant={dashboard.braintrustConfigured ? "default" : "outline"}>
            {dashboard.braintrustConfigured ? "Connected" : "Local only"}
          </Badge>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/braintrust">
            <RefreshCw className="size-3.5" />
            Refresh
          </Link>
        </Button>
      </header>

      <section className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription>Total logs</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl"><Activity className="size-5" />{dashboard.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription>Compared models</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl"><BarChart3 className="size-5" />{dashboard.byModel.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription>Average score</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl"><Gauge className="size-5" />{avgScore(dashboard.logs)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription>Latest event</CardDescription>
              <CardTitle className="text-base">{latest ? formatDate(latest.createdAt) : "No logs"}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.4fr]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Brain className="size-4" />Model comparison</CardTitle>
              <CardDescription>Counts grouped by model and provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.byModel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No model logs yet.</p>
              ) : (
                dashboard.byModel.map((row) => (
                  <Link href={`/admin/braintrust?model=${encodeURIComponent(row.model)}`} key={`${row.model}-${row.provider || "provider"}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-accent">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.model}</div>
                      <div className="text-xs text-muted-foreground">{providerFromModel(row.model, row.provider)}</div>
                    </div>
                    <Badge variant="secondary">{row.count}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Recent generation events</CardTitle>
              <CardDescription>Prompt/output debugging, quality scores and model comparisons.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scores</TableHead>
                      <TableHead>Output preview</TableHead>
                      <TableHead>Chat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.logs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">No Braintrust logs yet.</TableCell></TableRow>
                    ) : (
                      dashboard.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                          <TableCell><div className="max-w-[220px] truncate font-medium">{log.model}</div><div className="text-xs text-muted-foreground">{providerFromModel(log.model, log.provider)}</div></TableCell>
                          <TableCell><Badge variant="secondary">{log.status}</Badge></TableCell>
                          <TableCell className="max-w-[220px] text-xs text-muted-foreground">{scoreText(log.scores)}</TableCell>
                          <TableCell className="max-w-[360px] text-xs text-muted-foreground"><span className="line-clamp-2">{log.outputPreview || "—"}</span></TableCell>
                          <TableCell>{log.chatId ? <Button asChild size="sm" variant="outline"><Link href={`/chats/${log.chatId}`}>Open<ExternalLink className="size-3" /></Link></Button> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
