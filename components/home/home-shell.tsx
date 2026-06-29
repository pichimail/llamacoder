"use client"

import type { ReactNode } from "react"

export function HomeShell({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">{children}</main>
}
