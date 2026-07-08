"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type Chip = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

/**
 * Horizontal, drag-to-swipe chip row with edge fade masks and hidden
 * scrollbars. Used under prompt composers (landing + chat) for quick prompt
 * suggestions and app-type hints. Pointer drag scrolls; a click that did not
 * drag fires onSelect.
 */
export function ChipScroller({
  chips,
  onSelect,
  selectedValue,
  className,
  "aria-label": ariaLabel = "Suggestions",
}: {
  chips: Chip[];
  onSelect: (value: string) => void;
  selectedValue?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.active) return;
    const delta = e.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - delta;
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  return (
    <div
      ref={scrollerRef}
      role="listbox"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "flex cursor-grab snap-x gap-1.5 overflow-x-auto pb-0.5 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 18px, #000 calc(100% - 18px), transparent)",
        maskImage:
          "linear-gradient(to right, transparent, #000 18px, #000 calc(100% - 18px), transparent)",
      }}
    >
      {chips.map((chip) => {
        const selected = selectedValue === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              if (drag.current.moved) return;
              onSelect(chip.value);
            }}
            className={cn(
              "inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
              selected
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {chip.icon}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
