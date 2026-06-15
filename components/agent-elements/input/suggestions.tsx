"use client";

import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type SuggestionItem = {
  id: string;
  label: string;
  value?: string;
  icon?: ReactNode;
  className?: string;
};

export type SuggestionsProps = {
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
};

export function Suggestions({
  items,
  onSelect,
  disabled,
  className,
  itemClassName,
}: SuggestionsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "max-md:overflow-x-auto max-md:flex-nowrap max-md:pb-1 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden",
        "md:flex-wrap md:overflow-visible",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-border bg-transparent px-2 text-sm text-an-foreground-muted transition-colors hover:bg-an-background-secondary/40 hover:text-an-foreground disabled:opacity-50 disabled:pointer-events-none",
            itemClassName,
            item.className,
          )}
        >
          {item.icon && (
            <span className="inline-flex shrink-0">{item.icon}</span>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}
