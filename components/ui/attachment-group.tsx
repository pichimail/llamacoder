import * as React from "react";

import { cn } from "@/lib/utils";

export function AttachmentGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative w-full", className)} {...props}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-background/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-background/70 to-transparent" />
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

export function AttachmentItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("snap-start shrink-0", className)} {...props}>
      {children}
    </div>
  );
}
