"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AiModalSelector({ trigger, options = ["Claude 3.5", "GLM-4", "GPT-4o"], onSelect }: { trigger?: React.ReactNode; options?: string[]; onSelect?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground">{trigger || "Select model"}</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select AI model</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {options.map(o => (
              <button key={o} onClick={() => { onSelect?.(o); setOpen(false); }} className="rounded-lg border p-3 text-left hover:bg-accent">
                {o}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
