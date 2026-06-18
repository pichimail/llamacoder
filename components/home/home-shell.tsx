"use client"

import type { ReactNode } from "react"

import { HomeAppSidebar } from "@/components/home/app-sidebar"
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function HomeShell({ children }: { children: ReactNode }) {
  const { chats, user, authEnabled, isAuthenticated, loading } = useHomeSidebarData()

  return (
    <SidebarProvider defaultOpen={false}>
      <HomeAppSidebar
        chats={chats}
        user={user}
        authEnabled={authEnabled}
        isAuthenticated={isAuthenticated}
        loading={loading}
      />
      <SidebarInset className="min-h-dvh overflow-x-hidden overflow-y-auto">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/8 px-4 md:hidden">
          <SidebarTrigger className="-ml-1 rounded-lg border border-white/8 bg-white/5 text-[#F4F4F5]/80 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Chinna-Coder</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
