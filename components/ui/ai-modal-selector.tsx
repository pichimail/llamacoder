"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Cpu, Search, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Pacekit-style modal model selector. Opens a polished dialog with a search
 * field and selectable model cards. `options` are plain labels; the currently
 * selected label is highlighted with a check. Replaces the previous bare
 * button + unstyled list.
 */
export function AiModalSelector({
  trigger,
  options = ["Claude 3.5", "GLM-4", "GPT-4o"],
  value,
  onSelect,
}: {
  trigger?: React.ReactNode;
  options?: string[];
  value?: string;
  onSelect?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const current = selected ?? value;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        <Cpu className="size-3.5" aria-hidden="true" />
        <span className="max-w-[110px] truncate">{current || trigger || "Model"}</span>
        <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Select a model
            </DialogTitle>
          </DialogHeader>

          <div className="border-b border-border/60 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5">
              <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models…"
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search models"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No models match &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="grid gap-1.5">
                {filtered.map((o) => {
                  const isSelected = current === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        setSelected(o);
                        onSelect?.(o);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition",
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border/60 hover:border-primary/40 hover:bg-accent/50",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{o}</span>
                      </span>
                      {isSelected ? (
                        <Check className="size-4 text-primary" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
