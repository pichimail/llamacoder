"use client";

/** User-facing ChinnaLLM credits + BYOK page (Phase 2). */

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Balance = {
  balance: number;
  planTier: string;
  totalGranted: number;
  totalUsed: number;
  usage?: { totalCalls: number; creditsUsed: number };
  recentTransactions?: Array<{ id: string; amount: number; type: string; reason: string | null; createdAt: string }>;
};

type StoredKey = { id: string; provider: string; label: string | null; masked: string; createdAt: string };

export default function CreditsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [keys, setKeys] = useState<StoredKey[] | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const [creditsRes, keysRes] = await Promise.all([
      fetch("/api/chinnallm/credits", { cache: "no-store" }).catch(() => null),
      fetch("/api/chinnallm/byok", { cache: "no-store" }).catch(() => null),
    ]);
    if (creditsRes?.ok) setBalance(await creditsRes.json().catch(() => null));
    else setBalance(null);
    if (keysRes?.ok) {
      const data = await keysRes.json().catch(() => null);
      setKeys(Array.isArray(data?.keys) ? data.keys : []);
    } else setKeys([]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveKey = () => {
    const key = newKey.trim();
    if (key.length < 8) {
      toast({ title: "Enter a valid API key", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/chinnallm/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", key, label: newLabel.trim() || undefined }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok) {
        toast({ title: "Could not save key", description: data?.error, variant: "destructive" });
        return;
      }
      setNewKey("");
      setNewLabel("");
      toast({ title: "BYOK key saved", description: `Stored encrypted as ${data?.masked ?? "••••"}. ChinnaLLM calls with BYOK skip credit charges.` });
      void load();
    });
  };

  const deleteKey = (id: string) => {
    startTransition(async () => {
      const response = await fetch("/api/chinnallm/byok", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => null);
      if (!response?.ok) {
        toast({ title: "Could not delete key", variant: "destructive" });
        return;
      }
      toast({ title: "Key removed" });
      void load();
    });
  };

  const usedPercent = balance && balance.totalGranted > 0 ? Math.min(Math.round((balance.totalUsed / balance.totalGranted) * 100), 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] md:p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link href="/" aria-label="Back to home"><ArrowLeft className="size-5" /></Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Sparkles className="size-6 text-primary" /> ChinnaLLM credits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Credits power AI features inside apps you build. Bring your own key to skip charges.</p>
        </div>
      </div>

      {balance === null ? (
        <Skeleton className="h-[160px] rounded-xl" />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-lg">Balance</CardTitle>
              <Badge variant="secondary" className="rounded-full capitalize">{balance.planTier} plan</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums tracking-tight">{balance.balance.toLocaleString()}</span>
              <span className="pb-1 text-sm text-muted-foreground">of {balance.totalGranted.toLocaleString()} credits remaining</span>
            </div>
            <Progress value={usedPercent} aria-label={`${usedPercent}% of credits used`} />
            <p className="text-xs text-muted-foreground">{balance.usage?.totalCalls ?? 0} AI calls made · credits reset monthly based on your plan.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="size-4" /> Bring your own key</CardTitle>
          <CardDescription>Your key is encrypted with AES-256-GCM at rest and never returned to the browser. BYOK calls do not consume credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="byok-key">API key</Label>
              <Input id="byok-key" type="password" value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="sk-..." autoComplete="off" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="byok-label">Label (optional)</Label>
              <Input id="byok-label" value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Personal key" />
            </div>
            <Button onClick={saveKey} disabled={isPending} className="min-h-[44px]">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Save key
            </Button>
          </div>
          {keys === null ? (
            <Skeleton className="h-12 w-full" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys stored yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{key.label || "ChinnaLLM key"}</p>
                    <p className="text-xs text-muted-foreground">{key.masked} · added {new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => deleteKey(key.id)} aria-label="Delete key">
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {balance === null ? (
            <Skeleton className="h-24 w-full" />
          ) : !balance.recentTransactions || balance.recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet. Build an app that uses ChinnaLLM to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balance.recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-full">{transaction.type}</Badge></TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm">{transaction.reason || "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums ${transaction.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {transaction.amount >= 0 ? "+" : ""}{transaction.amount}
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
