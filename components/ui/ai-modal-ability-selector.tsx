"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const abilities = [
  { id: "3d", label: "3D/WebGL", desc: "Three.js scenes, physics, interactions" },
  { id: "backend", label: "Backend", desc: "Postgres, APIs, auth" },
  { id: "mobile", label: "Mobile", desc: "React Native / Flutter" },
  { id: "image", label: "Image", desc: "Generative images" },
  { id: "video", label: "Video", desc: "Video generation" },
  { id: "appstores", label: "App Stores", desc: "iOS / Android ready" },
];

export function AiModalAbilitySelector({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose abilities</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-4">
          {abilities.map(ab => (
            <button key={ab.id} onClick={() => toggle(ab.id)} className={`text-left rounded-xl border p-4 transition ${selected.includes(ab.id) ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-white/20'}`}>
              <div className="font-medium">{ab.label}</div>
              <div className="text-sm text-muted-foreground">{ab.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { selected.forEach(onSelect || (() => {})); onOpenChange(false); }}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
