"use client";

import { useEffect, useState } from "react";

const words = ["Scaffolding", "Architecting", "Composing", "Wiring", "Polishing", "Validating", "Optimizing", "Assembling", "Refining"];

export function AiResponseWriter({ isActive = false }: { isActive?: boolean }) {
  const [word, setWord] = useState(words[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % words.length;
      setWord(words[i]);
      setProgress((p) => (p + 12) % 100);
    }, 650);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/90">
      <div className="h-1.5 w-24 overflow-hidden rounded bg-white/10">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-amber-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="font-medium tracking-tight">{word}</span>
      <span className="text-[10px] uppercase text-white/50">building artifact</span>
    </div>
  );
}
