"use client"

import Link from "next/link"
import {
  GalleryVerticalEnd,
  Github,
  Home,
  Images,
  LifeBuoy,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NavRecentChats } from "@/components/home/nav-recent-chats"
import type { HomeSidebarChat, HomeSidebarUser } from "@/components/home/use-home-sidebar-data"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

const navSecondary = [
  {
    title: "Support",
    url: "https://github.com/pichimail/llamacoder/issues",
    icon: LifeBuoy,
  },
  {
    title: "GitHub",
    url: "https://github.com/pichimail/llamacoder",
    icon: Github,
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
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
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
      <SidebarContent>
        <NavMain items={navMain} />
        <NavRecentChats chats={chats} loading={loading} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {authEnabled && !isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
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