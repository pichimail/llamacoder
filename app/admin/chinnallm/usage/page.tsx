"use client";

/** ChinnaLLM usage analytics (Phase 4): date range, summary cards, filters,
 * invocation table, CSV export. */

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHINNALLM_TIERS } from "@/lib/chinnallm/tiers";

type UsageRecord = {
  id: string; userId: string; model: string; tier: string;
  inputTokens: number; outputTokens: number; creditsUsed: number;
  latencyMs: number | null; isByok: boolean; error: string | null; createdAt: string;
};

type Summary = { totalCalls: number; totalTokens: number; totalCredits: number; avgLatencyMs: number; errorRate: number };

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminUsagePage() {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(daysAgoISO(0));
  const [tier, setTier] = useState("all");
  const [byok, setByok] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<UsageRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  const buildQuery = useCallback((format?: string) => {
    const params = new URLSearchParams({ from, to });
    if (tier !== "all") params.set("tier", tier);
    if (byok !== "all") params.set("byok", byok);
    if (userFilter.trim()) params.set("userId", userFilter.trim());
    if (format) params.set("format", format);
    return params.toString();
  }, [from, to, tier, byok, userFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/chinnallm/usage?${buildQuery()}`, { cache: "no-store" }).catch(() => null);
    if (response?.ok) {
      const data = await response.json().catch(() => null);
      setSummary(data?.summary ?? null);
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } else {
      setSummary(null);
      setRecords([]);
    }
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { void load(); }, [load]);

  const summaryCards = [
    { label: "Total calls", value: summary?.totalCalls },
    { label: "Total tokens", value: summary?.totalTokens },
    { label: "Total credits", value: summary?.totalCredits },
    { label: "Avg latency", value: summary ? `${summary.avgLatencyMs}ms` : undefined },
    { label: "Error rate", value: summary ? `${summary.errorRate}%` : undefined },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every ChinnaLLM invocation with filters and CSV export.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="size-10 rounded-lg" onClick={() => void load()} disabled={loading} aria-label="Refresh">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
          <Button asChild variant="outline" className="h-10 gap-2 rounded-lg">
            <a href={`/api/admin/chinnallm/usage?${buildQuery("csv")}`} download><Download className="size-4" /> Export CSV</a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="usage-from">From</Label>
            <Input id="usage-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-lg" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usage-to">To</Label>
            <Input id="usage-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-lg" />
          </div>
          <div className="grid gap-2">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {CHINNALLM_TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>BYOK</Label>
            <Select value={byok} onValueChange={setByok}>
              <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">BYOK only</SelectItem>
                <SelectItem value="false">Credits only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usage-user">User ID</Label>
            <Input id="usage-user" value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="Filter by user id" className="h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{card.label}</CardDescription>
              {card.value === undefined ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <CardTitle className="text-2xl tabular-nums">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</CardTitle>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Records table */}
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {records === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No invocations in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens in/out</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-center">BYOK</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="max-w-[120px] truncate font-mono text-xs">{record.userId}</TableCell>
                    <TableCell className="text-sm">{record.model} <Badge variant="outline" className="ml-1 rounded-full text-[10px]">{record.tier}</Badge></TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{record.inputTokens.toLocaleString()} / {record.outputTokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{record.creditsUsed}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{record.latencyMs != null ? `${record.latencyMs}ms` : "—"}</TableCell>
                    <TableCell className="text-center">{record.isByok ? <Badge variant="secondary" className="rounded-full text-[10px]">BYOK</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {record.error
                        ? <Badge variant="outline" className="max-w-[140px] truncate rounded-full border-red-500/40 text-[10px] text-red-500" title={record.error}>error</Badge>
                        : <Badge variant="secondary" className="rounded-full text-[10px]">ok</Badge>}
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
