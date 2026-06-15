"use client"

import { GalleryVerticalEnd, Home, MessageSquare, Plus } from "lucide-react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { NavChats, type SidebarChat } from "@/components/chats/nav-chats"
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

const data = {
  user: {
    name: "Guest",
    email: "hyperspeed@local",
    avatar: "",
  },
  teams: [
    {
      name: "Hyperspeed",
      logo: GalleryVerticalEnd,
      plan: "AI Coder",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      items: [
        {
          title: "New Chat",
          url: "/",
        },
      ],
    },
    {
      title: "Chats",
      url: "#",
      icon: MessageSquare,
      isActive: true,
      items: [],
    },
  ],
}

export function ChatsAppSidebar({
  currentChatId,
  chats = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentChatId?: string
  chats?: SidebarChat[]
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
        <NavMain items={data.navMain} />
        <NavChats chats={chats} currentChatId={currentChatId} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}