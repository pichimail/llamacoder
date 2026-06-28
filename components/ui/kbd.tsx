import * as React from "react";

import { cn } from "@/lib/utils";

export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex min-h-5 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
