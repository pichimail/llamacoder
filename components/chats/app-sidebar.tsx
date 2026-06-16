"use client"

import Link from "next/link"
import { GalleryVerticalEnd, Home, Images, MessageSquare, Plus } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { NavChats, type SidebarChat } from "@/components/chats/nav-chats"
import type { HomeSidebarUser } from "@/components/home/use-home-sidebar-data"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    items: [
      { title: "New Chat", url: "/" },
      { title: "All Chats", url: "/chats" },
    ],
  },
  {
    title: "Chats",
    url: "/chats",
    icon: MessageSquare,
    isActive: true,
    items: [{ title: "Workspace", url: "/chats" }],
  },
  {
    title: "Discover",
    url: "/gallery",
    icon: Images,
    items: [{ title: "Gallery", url: "/gallery" }],
  },
]

const teams = [
  {
    name: "Chinna-Coder",
    logo: GalleryVerticalEnd,
    plan: "AI Coder",
  },
]

export function ChatsAppSidebar({
  currentChatId,
  chats = [],
  user,
  authEnabled = false,
  isAuthenticated = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentChatId?: string
  chats?: SidebarChat[]
  user: HomeSidebarUser
  authEnabled?: boolean
  isAuthenticated?: boolean
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
        <SidebarMenu>
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
        <NavChats chats={chats} currentChatId={currentChatId} />
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
      <SidebarRail />
    </Sidebar>
  )
}