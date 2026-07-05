"use client";

/** Credits management (Phase 4): manual grant/deduct with user search,
 * paginated transaction log with filters, bulk operations with confirmation. */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Loader2, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type UserHit = { id: string; email: string | null; name: string | null; creditBalance: number | null; planTier: string };
type Transaction = { id: string; userEmail: string; amount: number; type: string; reason: string | null; relatedChatId: string | null; createdAt: string };

export default function AdminCreditsPage() {
  // Manual op state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [amount, setAmount] = useState("100");
  const [opType, setOpType] = useState<"grant" | "deduct">("grant");
  const [reason, setReason] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [txUserFilter, setTxUserFilter] = useState("");
  const pageSize = 25;

  // Bulk ops
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false);
  const [bulkGrantAmount, setBulkGrantAmount] = useState("50");
  const [bulkResetOpen, setBulkResetOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Debounced user search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const query = userQuery.trim();
    if (query.length < 2) { setUserResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&pageSize=8`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null);
      setUserResults(Array.isArray(data?.users) ? data.users : []);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [userQuery]);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (txUserFilter.trim()) params.set("user", txUserFilter.trim());
    const response = await fetch(`/api/admin/credits/transactions?${params}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) {
      setTransactions(data?.transactions ?? []);
      setTotal(data?.total ?? 0);
    } else {
      setTransactions([]);
    }
  }, [page, typeFilter, txUserFilter]);

  useEffect(() => { void loadTransactions(); }, [loadTransactions]);

  const submitManualOp = () => {
    const parsedAmount = parseInt(amount, 10);
    if (!selectedUser || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Select a user and enter a positive amount", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "manual", userId: selectedUser.id, amount: parsedAmount, type: opType, reason: reason.trim() || undefined }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok) {
        toast({ title: `Could not ${opType}`, description: data?.error, variant: "destructive" });
        return;
      }
      toast({ title: `Credits ${opType === "grant" ? "granted" : "deducted"}`, description: `${selectedUser.email ?? selectedUser.id} — new balance: ${data?.balance?.balance ?? "—"}` });
      setSelectedUser((user) => (user ? { ...user, creditBalance: data?.balance?.balance ?? user.creditBalance } : user));
      void loadTransactions();
    });
  };

  const submitBulkGrant = () => {
    const parsedAmount = parseInt(bulkGrantAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    startTransition(async () => {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "bulk-grant-free", amount: parsedAmount }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      setBulkGrantOpen(false);
      if (!response?.ok) { toast({ title: "Bulk grant failed", description: data?.error, variant: "destructive" }); return; }
      toast({ title: "Bulk grant complete", description: `${data?.granted ?? 0} free-tier users received ${parsedAmount} credits.` });
      void loadTransactions();
    });
  };

  const submitBulkReset = () => {
    startTransition(async () => {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "bulk-reset-monthly" }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      setBulkResetOpen(false);
      if (!response?.ok) { toast({ title: "Reset failed", description: data?.error, variant: "destructive" }); return; }
      toast({ title: "Monthly reset complete", description: `${data?.reset ?? 0} accounts reset to plan allowance.` });
      void loadTransactions();
    });
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CreditCard className="size-6 text-primary" /> Credits Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manual operations, transaction log, and bulk actions.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Manual operation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual credit operation</CardTitle>
            <CardDescription>Search a user, then grant or deduct credits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative grid gap-2">
              <Label htmlFor="credit-user-search">User</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="credit-user-search"
                  value={selectedUser ? (selectedUser.email ?? selectedUser.id) : userQuery}
                  onChange={(event) => { setSelectedUser(null); setUserQuery(event.target.value); }}
                  placeholder="Search by email or name…"
                  className="h-10 rounded-lg pl-9"
                  autoComplete="off"
                />
              </div>
              {!selectedUser && userResults.length > 0 ? (
                <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
                  {userResults.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                        onClick={() => { setSelectedUser(user); setUserResults([]); }}
                      >
                        <span className="truncate">{user.email ?? user.name ?? user.id}</span>
                        <Badge variant="outline" className="rounded-full text-[10px]">{user.creditBalance ?? 0} cr</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {selectedUser ? (
              <p className="text-xs text-muted-foreground">
                Current balance: <span className="font-medium text-foreground">{selectedUser.creditBalance ?? 0} credits</span> · plan: {selectedUser.planTier}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="credit-amount">Amount</Label>
                <Input id="credit-amount" type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 rounded-lg" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={opType} onValueChange={(value) => setOpType(value as "grant" | "deduct")}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grant">Grant</SelectItem>
                    <SelectItem value="deduct">Deduct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="credit-reason">Reason</Label>
              <Input id="credit-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional note for the ledger" className="h-10 rounded-lg" />
            </div>
            <Button onClick={submitManualOp} disabled={isPending || !selectedUser} className="min-h-[44px] w-full rounded-lg">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {opType === "grant" ? "Grant credits" : "Deduct credits"}
            </Button>
          </CardContent>
        </Card>

        {/* Bulk operations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk operations</CardTitle>
            <CardDescription>Both actions require confirmation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Users className="size-4 text-muted-foreground" /> Grant to all free users</div>
              <div className="flex gap-2">
                <Input type="number" min={1} value={bulkGrantAmount} onChange={(event) => setBulkGrantAmount(event.target.value)} className="h-10 max-w-[120px] rounded-lg" aria-label="Bulk grant amount" />
                <Button variant="outline" className="h-10 flex-1 rounded-lg" onClick={() => setBulkGrantOpen(true)} disabled={isPending}>
                  Grant to free tier…
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4">
              <div className="text-sm font-medium">Reset monthly credits now</div>
              <p className="text-xs text-muted-foreground">Resets every account to its plan allowance and zeroes usage.</p>
              <Button variant="outline" className="h-10 rounded-lg" onClick={() => setBulkResetOpen(true)} disabled={isPending}>
                Run monthly reset…
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Transaction log</CardTitle>
              <CardDescription>{total.toLocaleString()} transactions</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input value={txUserFilter} onChange={(event) => { setPage(1); setTxUserFilter(event.target.value); }} placeholder="Filter by user email…" className="h-9 w-48 rounded-lg" aria-label="Filter transactions by user" />
              <Select value={typeFilter} onValueChange={(value) => { setPage(1); setTypeFilter(value); }}>
                <SelectTrigger className="h-9 w-[150px] rounded-lg" aria-label="Filter by type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="deduct">Deduct</SelectItem>
                  <SelectItem value="topup">Top-up</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="monthly_reset">Monthly reset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {transactions === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Chat</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="max-w-[180px] truncate text-sm">{transaction.userEmail}</TableCell>
                      <TableCell className={`text-right tabular-nums ${transaction.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {transaction.amount >= 0 ? "+" : ""}{transaction.amount}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="rounded-full text-[10px]">{transaction.type}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{transaction.reason ?? "—"}</TableCell>
                      <TableCell className="max-w-[110px] truncate font-mono text-xs text-muted-foreground">{transaction.relatedChatId ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk grant confirmation */}
      <Dialog open={bulkGrantOpen} onOpenChange={(open) => { if (!isPending) setBulkGrantOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Grant {bulkGrantAmount} credits to all free users?</DialogTitle>
            <DialogDescription>Every free-tier account receives the grant and a ledger entry. This cannot be undone in one step.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkGrantOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitBulkGrant} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirm grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reset confirmation */}
      <Dialog open={bulkResetOpen} onOpenChange={(open) => { if (!isPending) setBulkResetOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset monthly credits for everyone?</DialogTitle>
            <DialogDescription>All accounts reset to their plan allowance immediately. Usage counters are zeroed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkResetOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={submitBulkReset} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Reset now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
