"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, ExternalLink, Gauge, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type GenerationLogRow = {
  id: string;
  chatId: string | null;
  model: string;
  provider: string | null;
  status: string;
  outputPreview: string;
  durationMs: number | null;
  createdAt: string;
};

type LogDashboard = {
  logs: GenerationLogRow[];
  total: number;
  byModel: Array<{ model: string; provider: string | null; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  braintrustConfigured: boolean;
  braintrustProjectId: string | null;
};

export default function BraintrustAdminPage() {
  const [data, setData] = useState<LogDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/braintrust/logs", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLogs = (data?.logs ?? []).filter(
    (log) =>
      log.model.toLowerCase().includes(search.toLowerCase()) ||
      (log.provider ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Generation Logs</h1>
          <p className="text-muted-foreground">Real generation events, status, and per-model call volume — live from the database.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data?.braintrustConfigured ? "default" : "outline"}>
            {data?.braintrustConfigured ? "Braintrust connected" : "Braintrust not configured"}
          </Badge>
          <Button onClick={() => void load()} variant="outline" size="sm" disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {failed ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load generation logs. Check admin access and database connectivity.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total logged generations</CardDescription>
            {data ? (
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Activity className="size-5" /> {data.total.toLocaleString()}
              </CardTitle>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Distinct models</CardDescription>
            {data ? (
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="size-5" /> {data.byModel.length}
              </CardTitle>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success rate (recent)</CardDescription>
            {data ? (
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Gauge className="size-5" />
                {data.byStatus.reduce((sum, row) => sum + row.count, 0) > 0
                  ? `${Math.round(
                      ((data.byStatus.find((row) => row.status === "success")?.count ?? 0) /
                        data.byStatus.reduce((sum, row) => sum + row.count, 0)) *
                        100,
                    )}%`
                  : "—"}
              </CardTitle>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Generation events</CardTitle>
              <CardDescription>Most recent logged generations across all users</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search model or provider..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data === null ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-8 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{log.model}</TableCell>
                      <TableCell className="text-muted-foreground">{log.provider ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : "outline"}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}</TableCell>
                      <TableCell className="line-clamp-1 max-w-[280px] text-xs text-muted-foreground">{log.outputPreview || "—"}</TableCell>
                      <TableCell>
                        {log.chatId ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/chats/${log.chatId}`}>
                              Open <ExternalLink className="ml-1 size-3" />
                            </Link>
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No matching logs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
