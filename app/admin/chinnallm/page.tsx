"use client";

/** ChinnaLLM model management (Phase 4): full CRUD table with dialogs,
 * tier filter, enable toggles, confirmed deletes. Admin-only openRouterId. */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CHINNALLM_TIERS } from "@/lib/chinnallm/tiers";

type AdminModel = {
  id: string;
  displayName: string;
  openRouterId: string;
  tier: string;
  costPerKTokens: number;
  enabled: boolean;
  sortOrder: number;
  description: string | null;
  capabilities: string[];
};

const ALL_CAPABILITIES = ["text", "vision", "image", "code", "music", "video", "streaming", "reasoning"];

type ModelForm = {
  displayName: string;
  openRouterId: string;
  tier: string;
  costPerKTokens: string;
  description: string;
  capabilities: string[];
};

const EMPTY_FORM: ModelForm = { displayName: "", openRouterId: "", tier: "auto", costPerKTokens: "1", description: "", capabilities: ["text", "streaming"] };

export default function AdminChinnaLLMModelsPage() {
  const [models, setModels] = useState<AdminModel[] | null>(null);
  const [tierFilter, setTierFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminModel | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/chinnallm/models", { cache: "no-store" }).catch(() => null);
    if (response?.ok) {
      const data = await response.json().catch(() => null);
      setModels(Array.isArray(data?.models) ? data.models : []);
    } else {
      setModels([]);
      toast({ title: "Could not load models", description: "Check admin access and that migrations + seed have run.", variant: "destructive" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleModels = useMemo(
    () => (models ?? []).filter((model) => tierFilter === "all" || model.tier === tierFilter),
    [models, tierFilter],
  );

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (model: AdminModel) => {
    setEditingId(model.id);
    setForm({
      displayName: model.displayName,
      openRouterId: model.openRouterId,
      tier: model.tier,
      costPerKTokens: String(model.costPerKTokens),
      description: model.description ?? "",
      capabilities: model.capabilities,
    });
    setDialogOpen(true);
  };

  const submitForm = () => {
    const cost = parseInt(form.costPerKTokens, 10);
    if (!form.displayName.trim() || !form.openRouterId.trim() || !Number.isFinite(cost) || cost < 0) {
      toast({ title: "Fill display name, provider ID, and a valid cost", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        displayName: form.displayName.trim(),
        openRouterId: form.openRouterId.trim(),
        tier: form.tier,
        costPerKTokens: cost,
        description: form.description.trim() || undefined,
        capabilities: form.capabilities,
        ...(editingId ? {} : { enabled: true, sortOrder: 0 }),
      };
      const response = await fetch("/api/admin/chinnallm/models", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok) {
        toast({ title: editingId ? "Update failed" : "Create failed", description: data?.error, variant: "destructive" });
        return;
      }
      toast({ title: editingId ? "Model updated" : "Model added" });
      setDialogOpen(false);
      void load();
    });
  };

  const toggleModel = (model: AdminModel) => {
    startTransition(async () => {
      const response = await fetch("/api/admin/chinnallm/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id, enabled: !model.enabled }),
      }).catch(() => null);
      if (!response?.ok) { toast({ title: "Toggle failed", variant: "destructive" }); return; }
      setModels((items) => (items ?? []).map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m)));
    });
  };

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    startTransition(async () => {
      const response = await fetch("/api/admin/chinnallm/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (!response?.ok) {
        toast({ title: "Delete failed", description: data?.error, variant: "destructive" });
      } else {
        toast({ title: `${target.displayName} deleted` });
        void load();
      }
      setDeleteTarget(null);
    });
  };

  const toggleCapability = (cap: string) => {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(cap) ? f.capabilities.filter((c) => c !== cap) : [...f.capabilities, cap],
    }));
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="size-6 text-primary" /> ChinnaLLM Models
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Provider IDs are visible only in this admin console.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-10 w-[150px] rounded-lg" aria-label="Filter by tier">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {CHINNALLM_TIERS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-10 rounded-lg" onClick={() => void load()} disabled={isPending} aria-label="Refresh">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
          <Button onClick={openAdd} className="h-10 gap-2 rounded-lg"><Plus className="size-4" /> Add Model</Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {models === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : visibleModels.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {models.length === 0 ? "No models found. Run `pnpm seed:chinnallm`, then refresh." : "No models in this tier."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Provider ID</TableHead>
                  <TableHead className="text-right">Cost/1k</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleModels.map((model) => (
                  <TableRow key={model.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">{model.displayName}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-full text-[11px]">{model.tier}</Badge></TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">{model.openRouterId}</TableCell>
                    <TableCell className="text-right tabular-nums">{model.costPerKTokens}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={model.enabled} onCheckedChange={() => toggleModel(model)} aria-label={`Toggle ${model.displayName}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-9" onClick={() => openEdit(model)} aria-label={`Edit ${model.displayName}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(model)} aria-label={`Delete ${model.displayName}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!isPending) setDialogOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit model" : "Add model"}</DialogTitle>
            <DialogDescription>Display name is user-visible; the provider model ID is admin-only.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model-name">Display Name</Label>
              <Input id="model-name" value={form.displayName} onChange={(event) => setForm((f) => ({ ...f, displayName: event.target.value }))} placeholder="ChinnaLLM Pro" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-orid">Provider Model ID</Label>
              <Input id="model-orid" value={form.openRouterId} onChange={(event) => setForm((f) => ({ ...f, openRouterId: event.target.value }))} placeholder="vendor/model-id" className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Tier</Label>
                <Select value={form.tier} onValueChange={(value) => setForm((f) => ({ ...f, tier: value }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHINNALLM_TIERS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model-cost">Cost / 1k tokens</Label>
                <Input id="model-cost" type="number" min={0} value={form.costPerKTokens} onChange={(event) => setForm((f) => ({ ...f, costPerKTokens: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Capabilities</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_CAPABILITIES.map((cap) => {
                  const selected = form.capabilities.includes(cap);
                  return (
                    <Button key={cap} type="button" variant={selected ? "secondary" : "outline"} size="sm" className="h-8 rounded-full text-xs" onClick={() => toggleCapability(cap)} aria-pressed={selected}>
                      {cap}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-desc">Description</Label>
              <Textarea id="model-desc" rows={2} value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} placeholder="Short user-facing description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitForm} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !isPending) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.displayName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the model from the registry. Models with usage history cannot be deleted — disable them instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
