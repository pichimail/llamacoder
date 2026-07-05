"use client";

/** Artifact moderation (Priority 3): list all user-generated chats, hide/unhide
 * or delete them, and review the audit trail of admin actions. */

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Search, ShieldAlert, Trash2 } from "lucide-react";
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

type ArtifactRow = {
  id: string;
  title: string;
  promptPreview: string;
  model: string;
  isHidden: boolean;
  isArchived: boolean;
  moderationNote: string | null;
  moderatedAt: string | null;
  createdAt: string;
  messageCount: number;
  owner: { id: string; email: string | null; name: string | null } | null;
  projectName: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  resourceId: string | null;
  metadata: any;
  createdAt: string;
  actor: { id: string; email: string | null; name: string | null } | null;
};

type PendingAction = { row: ArtifactRow; action: "hide" | "unhide" | "delete" } | null;

export default function AdminArtifactsPage() {
  const [rows, setRows] = useState<ArtifactRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState<PendingAction>(null);
  const [note, setNote] = useState("");
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), status });
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/admin/artifacts?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setRows([]));
  }, [page, status, search]);

  const loadAudit = useCallback(() => {
    fetch(`/api/admin/audit-log?prefix=admin.artifact.`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAudit(data.rows))
      .catch(() => setAudit([]));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  const confirmAction = () => {
    if (!pending) return;
    const { row, action } = pending;
    startTransition(async () => {
      const res = await fetch("/api/admin/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        toast({ title: "Action failed", description: "Could not update the artifact." });
        return;
      }
      toast({
        title: action === "delete" ? "Artifact deleted" : action === "hide" ? "Artifact hidden" : "Artifact restored",
      });
      setPending(null);
      setNote("");
      load();
      loadAudit();
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artifact Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, hide, or remove user-generated artifacts. Every action is recorded in the audit trail.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All artifacts ({total})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search title, prompt, or id"
                  className="h-9 w-56 pl-8"
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No artifacts match this filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artifact</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="max-w-[280px]">
                      <div className="truncate text-sm font-medium">{row.title || "Untitled"}</div>
                      <div className="truncate text-xs text-muted-foreground">{row.promptPreview}</div>
                      {row.moderationNote ? (
                        <div className="mt-0.5 truncate text-[11px] text-amber-500">Note: {row.moderationNote}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {row.owner?.email || row.owner?.name || "—"}
                    </TableCell>
                    <TableCell className="max-w-[130px] truncate text-xs text-muted-foreground">{row.model}</TableCell>
                    <TableCell>
                      {row.isHidden ? (
                        <Badge variant="outline" className="rounded-full border-destructive/40 text-[10px] text-destructive">Hidden</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full text-[10px]">Visible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {row.isHidden ? (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { setPending({ row, action: "unhide" }); setNote(""); }}>
                            <Eye className="mr-1 size-3.5" /> Unhide
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { setPending({ row, action: "hide" }); setNote(""); }}>
                            <EyeOff className="mr-1 size-3.5" /> Hide
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => { setPending({ row, action: "delete" }); setNote(""); }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4" /> Moderation audit trail</CardTitle>
          <CardDescription className="text-xs">Recent admin actions on artifacts</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {audit === null ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : audit.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No moderation actions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Artifact</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="outline" className="rounded-full text-[10px]">{row.action.replace("admin.artifact.", "")}</Badge></TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{(row.metadata?.title as string) || row.resourceId}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{row.actor?.email || row.actor?.name || "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">{(row.metadata?.note as string) || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) { setPending(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "delete" ? "Delete artifact?" : pending?.action === "hide" ? "Hide artifact?" : "Restore artifact?"}
            </DialogTitle>
            <DialogDescription>
              {pending?.action === "delete"
                ? "This permanently removes the artifact and its messages. This cannot be undone."
                : pending?.action === "hide"
                  ? "Hidden artifacts are removed from public surfaces (gallery, shared links, featured)."
                  : "This restores the artifact to public surfaces."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="mod-note" className="text-xs">Reason / note (optional)</Label>
            <Input id="mod-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. TOS violation" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPending(null); setNote(""); }}>Cancel</Button>
            <Button
              variant={pending?.action === "delete" ? "destructive" : "default"}
              disabled={isPending}
              onClick={confirmAction}
            >
              {pending?.action === "delete" ? "Delete" : pending?.action === "hide" ? "Hide" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
