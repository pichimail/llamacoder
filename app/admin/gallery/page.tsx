"use client";

/** Gallery management (Phase 4): curate featured pins with add/remove. */

import { useCallback, useEffect, useState, useTransition } from "react";
import { Images, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type Pin = { id?: string; slug: string; messageId?: string; title: string; description?: string; tags?: string[]; source?: string };

export default function AdminGalleryPage() {
  const [pins, setPins] = useState<Pin[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ messageId: "", title: "", description: "", tags: "" });
  const [deleteTarget, setDeleteTarget] = useState<Pin | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/featured", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) setPins(Array.isArray(data?.apps) ? data.apps : Array.isArray(data?.pins) ? data.pins : []);
    else setPins([]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addPin = () => {
    if (!form.messageId.trim()) {
      toast({ title: "Message ID is required", description: "Use the share/message id of the artifact to feature.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: form.messageId.trim(),
          title: form.title.trim() || undefined,
          description: form.description.trim() || undefined,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok) { toast({ title: "Could not add pin", description: data?.error, variant: "destructive" }); return; }
      toast({ title: "Added to gallery" });
      setAddOpen(false);
      setForm({ messageId: "", title: "", description: "", tags: "" });
      void load();
    });
  };

  const removePin = () => {
    const target = deleteTarget;
    if (!target) return;
    startTransition(async () => {
      const response = await fetch("/api/admin/featured", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: target.slug }),
      }).catch(() => null);
      setDeleteTarget(null);
      if (!response?.ok) { toast({ title: "Could not remove", variant: "destructive" }); return; }
      toast({ title: `Removed "${target.title}"` });
      void load();
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Images className="size-6 text-primary" /> Gallery Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Curate the featured apps shown on the landing page and gallery.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="h-10 gap-2 rounded-lg"><Plus className="size-4" /> Add pin</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {pins === null ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : pins.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No featured pins yet. Curated pins appear ahead of built-in templates.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pins.map((pin) => (
                  <TableRow key={pin.slug} className="transition-colors hover:bg-muted/40">
                    <TableCell className="max-w-[220px] truncate font-medium">{pin.title}</TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">{pin.slug}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(pin.tags ?? []).slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="rounded-full text-[10px]">{tag}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full text-[10px]">{pin.source ?? (pin.messageId ? "pinned" : "built-in")}</Badge></TableCell>
                    <TableCell className="text-right">
                      {pin.messageId || pin.id ? (
                        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(pin)} aria-label={`Remove ${pin.title}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">built-in</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add pin dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!isPending) setAddOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add featured pin</DialogTitle>
            <DialogDescription>Feature an existing artifact by its message ID.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pin-message">Message ID</Label>
              <Input id="pin-message" value={form.messageId} onChange={(event) => setForm((f) => ({ ...f, messageId: event.target.value }))} placeholder="Artifact message id" className="font-mono text-sm" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pin-title">Title</Label>
              <Input id="pin-title" value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} placeholder="Optional — defaults to chat title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pin-desc">Description</Label>
              <Textarea id="pin-desc" rows={2} value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pin-tags">Tags</Label>
              <Input id="pin-tags" value={form.tags} onChange={(event) => setForm((f) => ({ ...f, tags: event.target.value }))} placeholder="comma, separated, tags" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={addPin} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add pin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !isPending) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove "{deleteTarget?.title}"?</DialogTitle>
            <DialogDescription>The pin is removed from the gallery. The underlying artifact is not deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={removePin} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
