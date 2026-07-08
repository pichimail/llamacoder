"use client";

import { useState } from "react";
import { Box, Check, Database, ImageIcon, Smartphone, Store, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const abilities = [
  { id: "3d", label: "3D / WebGL", desc: "Three.js scenes, physics, interactions", icon: Box },
  { id: "backend", label: "Backend", desc: "Postgres, APIs, auth", icon: Database },
  { id: "mobile", label: "Mobile", desc: "React Native / Flutter", icon: Smartphone },
  { id: "image", label: "Image", desc: "Generative images", icon: ImageIcon },
  { id: "video", label: "Video", desc: "Video generation", icon: Video },
  { id: "appstores", label: "App Stores", desc: "iOS / Android ready", icon: Store },
];

/**
 * Pacekit-style ability picker. A polished 2-column grid of toggleable
 * capability cards with icons, selection ring, and a check badge.
 */
export function AiModalAbilitySelector({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose abilities</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-2">
          {abilities.map((ab) => {
            const isSelected = selected.includes(ab.id);
            const Icon = ab.icon;
            return (
              <button
                key={ab.id}
                type="button"
                onClick={() => toggle(ab.id)}
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition",
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/60 hover:border-primary/40 hover:bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{ab.label}</span>
                  <span className="block text-xs text-muted-foreground">{ab.desc}</span>
                </span>
                {isSelected ? (
                  <Check className="absolute right-2.5 top-2.5 size-4 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              selected.forEach(onSelect || (() => {}));
              onOpenChange(false);
            }}
          >
            Apply{selected.length ? ` (${selected.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
