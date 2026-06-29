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

"use client";

import { useState } from "react";
import { 
  Activity, 
  BarChart3, 
  Gauge, 
  RefreshCw, 
  Search 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Simulated data to match admin theme (in real app this would come from server)
const mockLogs = [
  { id: 1, model: "claude-3-5-sonnet", score: 0.94, provider: "Anthropic", time: "3m ago", quality: "Excellent" },
  { id: 2, model: "gpt-4o", score: 0.89, provider: "OpenAI", time: "12m ago", quality: "Good" },
  { id: 3, model: "gemini-1.5-pro", score: 0.82, provider: "Google", time: "25m ago", quality: "Good" },
];

export default function BraintrustAdminPage() {
  const [logs, setLogs] = useState(mockLogs);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = logs.filter(log => 
    log.model.toLowerCase().includes(search.toLowerCase()) ||
    log.provider.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = (logs.reduce((sum, log) => sum + log.score, 0) / logs.length).toFixed(2);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh with new random log
    setTimeout(() => {
      const newLog = {
        id: Date.now(),
        model: ["claude-3-5-sonnet", "gpt-4o", "gemini-1.5-pro"][Math.floor(Math.random() * 3)],
        score: 0.75 + Math.random() * 0.22,
        provider: ["Anthropic", "OpenAI", "Google"][Math.floor(Math.random() * 3)],
        time: "just now",
        quality: "Excellent",
      };
      setLogs([newLog, ...logs.slice(0, 9)]);
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Braintrust Logs</h1>
          <p className="text-muted-foreground">Quality, debugging and model comparison</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="default">Connected</Badge>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats matching admin theme */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total logs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="size-5" /> {logs.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compared models</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="size-5" /> {new Set(logs.map(l => l.model)).size}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average score</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gauge className="size-5" /> {avgScore}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl text-green-500">Connected</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generation Logs</CardTitle>
              <CardDescription>Quality scores and model performance</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models or providers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.model}</TableCell>
                    <TableCell>{log.provider}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{log.score.toFixed(2)}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded">
                          <div 
                            className="h-1.5 bg-primary rounded transition-all" 
                            style={{ width: `${log.score * 100}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.quality === "Excellent" ? "default" : "secondary"}>
                        {log.quality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.time}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No logs match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

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
