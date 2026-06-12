import * as React from "react"

import { cn } from "@/lib/utils"

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const classes =
    variant === "secondary"
      ? "border-transparent bg-secondary text-secondary-foreground"
      : variant === "outline"
        ? "border-border text-foreground"
        : "border-transparent bg-primary text-primary-foreground"

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        classes,
        className
      )}
      {...props}
    />
  )
}
