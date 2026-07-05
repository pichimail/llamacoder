"use client";

/** User management (Phase 4): searchable/filterable table, detail Sheet,
 * plan changes, credit grants, BYOK revoke with confirmation. */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Eye, KeyRound, Loader2, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type UserRow = {
  id: string; email: string | null; name: string | null; image: string | null;
  joinedAt: string; isAdmin: boolean; planTier: string;
  creditBalance: number | null; byokCount: number; appsBuilt: number;
};

type UserDetail = {
  user: {
    id: string; email: string | null; name: string | null; image: string | null;
    createdAt: string; role: string; plan: string; creditBalance: number | null;
    aiCalls: number; aiCreditsUsed: number;
    credits: { planTier: string; totalGranted: number; totalUsed: number } | null;
    apiKeys: Array<{ id: string; provider: string; label: string | null; createdAt: string }>;
    projects: Array<{ id: string; name: string; chats: Array<{ id: string; title: string; createdAt: string }> }>;
  };
  transactions: Array<{ id: string; amount: number; type: string; reason: string | null; createdAt: string }>;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [byokFilter, setByokFilter] = useState("all");
  const [sort, setSort] = useState("joined");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 25;

  // Detail sheet
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [grantAmount, setGrantAmount] = useState("100");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); setDebouncedSearch(search.trim()); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (planFilter !== "all") params.set("plan", planFilter);
    if (byokFilter !== "all") params.set("byok", byokFilter);
    const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) { setUsers(data?.users ?? []); setTotal(data?.total ?? 0); }
    else setUsers([]);
  }, [page, debouncedSearch, planFilter, byokFilter, sort]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetail(null);
    void fetch(`/api/admin/users/${id}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDetail(data))
      .catch(() => undefined);
  };

  const changePlan = (planTier: string) => {
    const id = detailId;
    if (!id) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      }).catch(() => null);
      if (!response?.ok) { toast({ title: "Plan change failed", variant: "destructive" }); return; }
      toast({ title: `Plan changed to ${planTier}` });
      openDetail(id);
      void load();
    });
  };

  const grantToUser = () => {
    const id = detailId;
    const parsedAmount = parseInt(grantAmount, 10);
    if (!id || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    startTransition(async () => {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "manual", userId: id, amount: parsedAmount, type: "grant", reason: "Admin grant from user panel" }),
      }).catch(() => null);
      setGrantDialogOpen(false);
      if (!response?.ok) { toast({ title: "Grant failed", variant: "destructive" }); return; }
      toast({ title: `Granted ${parsedAmount} credits` });
      openDetail(id);
      void load();
    });
  };

  const revokeByok = () => {
    const id = detailId;
    if (!id) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeByok: true }),
      }).catch(() => null);
      setRevokeDialogOpen(false);
      if (!response?.ok) { toast({ title: "Revoke failed", variant: "destructive" }); return; }
      toast({ title: "All BYOK keys revoked" });
      openDetail(id);
      void load();
    });
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="size-6 text-primary" /> User Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{total.toLocaleString()} users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email or name…" className="h-10 rounded-lg pl-9" aria-label="Search users" />
          </div>
          <Select value={planFilter} onValueChange={(value) => { setPage(1); setPlanFilter(value); }}>
            <SelectTrigger className="h-10 rounded-lg" aria-label="Filter by plan"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={byokFilter} onValueChange={(value) => { setPage(1); setByokFilter(value); }}>
            <SelectTrigger className="h-10 rounded-lg" aria-label="Filter by BYOK"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">BYOK: all</SelectItem>
              <SelectItem value="true">Has BYOK key</SelectItem>
              <SelectItem value="false">No BYOK key</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-10 rounded-lg" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="joined">Sort: joined</SelectItem>
              <SelectItem value="credits">Sort: credits</SelectItem>
              <SelectItem value="apps">Sort: apps built</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {users === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No users match these filters.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Apps</TableHead>
                    <TableHead className="text-center">BYOK</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="transition-colors hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={user.image ?? undefined} alt="" />
                            <AvatarFallback className="text-xs">{(user.name || user.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-sm font-medium">
                              {user.name || "—"} {user.isAdmin ? <Badge variant="secondary" className="ml-1 rounded-full text-[9px]">admin</Badge> : null}
                            </p>
                            <p className="max-w-[180px] truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="rounded-full capitalize">{user.planTier}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{user.creditBalance ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{user.appsBuilt}</TableCell>
                      <TableCell className="text-center">
                        {user.byokCount > 0
                          ? <Badge variant="secondary" className="rounded-full text-[10px]"><KeyRound className="mr-1 size-2.5" />{user.byokCount}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(user.joinedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-9" onClick={() => openDetail(user.id)} aria-label={`View ${user.email ?? user.id}`}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
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

      {/* Detail Sheet */}
      <Sheet open={detailId !== null} onOpenChange={(open) => { if (!open) { setDetailId(null); setDetail(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="text-left">
            <SheetTitle>User details</SheetTitle>
            <SheetDescription>Profile, credits, apps, and API keys.</SheetDescription>
          </SheetHeader>
          {detail === null ? (
            <div className="mt-6 space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={detail.user.image ?? undefined} alt="" />
                  <AvatarFallback>{(detail.user.name || detail.user.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{detail.user.name || "—"}</p>
                  <p className="truncate text-sm text-muted-foreground">{detail.user.email}</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(detail.user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border p-3">
                  <p className="text-lg font-bold tabular-nums">{detail.user.creditBalance ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Credits</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-lg font-bold tabular-nums">{detail.user.aiCalls}</p>
                  <p className="text-[11px] text-muted-foreground">AI calls</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-lg font-bold tabular-nums">{detail.user.aiCreditsUsed}</p>
                  <p className="text-[11px] text-muted-foreground">Credits used</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Plan tier</Label>
                <Select value={detail.user.credits?.planTier ?? "free"} onValueChange={changePlan} disabled={isPending}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="h-10 flex-1 rounded-lg" onClick={() => setGrantDialogOpen(true)} disabled={isPending}>Grant credits…</Button>
                <Button variant="outline" className="h-10 flex-1 rounded-lg text-destructive hover:text-destructive" onClick={() => setRevokeDialogOpen(true)} disabled={isPending || detail.user.apiKeys.length === 0}>
                  Revoke BYOK ({detail.user.apiKeys.length})
                </Button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Recent apps</p>
                {detail.user.projects.flatMap((project) => project.chats).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No apps yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.user.projects.flatMap((project) => project.chats).slice(0, 8).map((chat) => (
                      <li key={chat.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span className="truncate">{chat.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(chat.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Credit history</p>
                {detail.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No transactions.</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.transactions.slice(0, 10).map((transaction) => (
                      <li key={transaction.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                        <span className="truncate text-muted-foreground">{transaction.reason ?? transaction.type}</span>
                        <span className={`shrink-0 tabular-nums ${transaction.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {transaction.amount >= 0 ? "+" : ""}{transaction.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Grant dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={(open) => { if (!isPending) setGrantDialogOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Grant credits</DialogTitle>
            <DialogDescription>Adds credits to this user with a ledger entry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="detail-grant-amount">Amount</Label>
            <Input id="detail-grant-amount" type="number" min={1} value={grantAmount} onChange={(event) => setGrantAmount(event.target.value)} className="h-10 rounded-lg" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={grantToUser} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke BYOK confirmation */}
      <Dialog open={revokeDialogOpen} onOpenChange={(open) => { if (!isPending) setRevokeDialogOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Revoke all BYOK keys?</DialogTitle>
            <DialogDescription>The user's stored API keys are permanently deleted. Their apps fall back to credits.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={revokeByok} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Revoke keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
