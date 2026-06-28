"use client"

import Link from "next/link"
import { GalleryVerticalEnd, Home, Images, MessageSquare, Plus, Shield } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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

function getNavMain(isAdmin?: boolean) {
  return [
    {
      title: "Home",
      url: "/",
      icon: Home,
      items: [
        { title: "New build", url: "/" },
        { title: "All chats", url: "/chats" },
      ],
    },
    {
      title: "Chats",
      url: "/chats",
      icon: MessageSquare,
      isActive: true,
      items: [
        { title: "Workspace", url: "/chats" },
        { title: "Current builder", url: "#chat-builder-split" },
      ],
    },
    {
      title: "Discover",
      url: "/gallery",
      icon: Images,
      items: [{ title: "Gallery", url: "/gallery" }],
    },
    ...(isAdmin
      ? [
          {
            title: "Admin",
            url: "/admin",
            icon: Shield,
            items: [
              { title: "Overview", url: "/admin" },
              { title: "Feature flags", url: "/admin?section=flags" },
              { title: "Deployment", url: "/admin?section=deploy" },
            ],
          },
        ]
      : []),
  ]
}

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
    <Sidebar collapsible="icon" variant="inset" className="bg-[#1F2023] text-[#F4F4F5]" {...props}>
      <SidebarHeader className="gap-3 border-b border-white/8 bg-[#1F2023]/95 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="rounded-xl border border-white/8 bg-white/5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm">
                  <GalleryVerticalEnd className="size-4 stroke-[1.8]" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Chinna-Coder</span>
                  <span className="truncate text-xs">Builder workspace</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="New Chat" className="rounded-xl transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white">
              <Link href="/">
                <Plus className="stroke-[1.8]" />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-[#1F2023] px-0 py-2">
        <NavMain items={getNavMain(user.isAdmin)} />
        <NavChats chats={chats} currentChatId={currentChatId} />
      </SidebarContent>
      <SidebarFooter className="border-t border-white/8 bg-[#1F2023]/95">
        {authEnabled && !isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="rounded-xl border border-white/8 bg-white/5 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white">
                <Link href="/api/auth/signin/google">
                  <MessageSquare className="stroke-[1.8]" />
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
