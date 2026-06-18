"use client"

import Link from "next/link"
import {
  GalleryVerticalEnd,
  Home,
  Images,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavRecentChats } from "@/components/home/nav-recent-chats"
import ThemeToggle from "@/components/theme-toggle"
import type { HomeSidebarChat, HomeSidebarUser } from "@/components/home/use-home-sidebar-data"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    isActive: true,
    items: [
      { title: "New Chat", url: "/" },
      { title: "All Chats", url: "/chats" },
    ],
  },
  {
    title: "Build",
    url: "#prompt-composer",
    icon: Sparkles,
    items: [
      { title: "Prompt Composer", url: "#prompt-composer" },
      { title: "Examples", url: "#examples" },
    ],
  },
  {
    title: "Discover",
    url: "/gallery",
    icon: Images,
    items: [
      { title: "Gallery", url: "/gallery" },
      { title: "GitHub", url: "https://github.com/pichimail/llamacoder" },
    ],
  },
]

export function HomeAppSidebar({
  chats,
  user,
  authEnabled,
  isAuthenticated,
  loading,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  chats: HomeSidebarChat[]
  user: HomeSidebarUser
  authEnabled: boolean
  isAuthenticated: boolean
  loading?: boolean
}) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarRail />
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 bg-sidebar/95 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="data-[active=true]:bg-sidebar-accent">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Chinna-Coder</span>
                  <span className="truncate text-xs">Build at hyperspeed</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="New Chat">
              <Link href="/">
                <Plus />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar px-0 py-2">
        <NavMain items={navMain} />
        <NavRecentChats chats={chats} loading={loading} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 bg-sidebar/95">
        <div className="flex items-center justify-between px-2">
          <ThemeToggle className="size-9" />
          <span className="text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            Theme
          </span>
        </div>
        <SidebarSeparator />
        {authEnabled && !isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="bg-sidebar-accent/40">
                <Link href="/api/auth/signin/google">
                  <MessageSquare />
                  <span>Sign in with Google</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <NavUser
            user={user}
            authEnabled={authEnabled}
            isAuthenticated={isAuthenticated}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
