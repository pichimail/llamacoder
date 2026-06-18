"use client"

import Link from "next/link"
import { MessageSquare, MoreHorizontal, Pin } from "lucide-react"

import type { HomeSidebarChat } from "@/components/home/use-home-sidebar-data"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavRecentChats({
  chats,
  loading,
}: {
  chats: HomeSidebarChat[]
  loading?: boolean
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="rounded-xl">
              <MessageSquare className="stroke-[1.8]" />
              <span>Loading chats...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : chats.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl transition-all duration-200 ease-out hover:-translate-y-px">
              <Link href="/">
                <MessageSquare className="stroke-[1.8]" />
                <span>Start your first chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton asChild tooltip={chat.title} className="rounded-xl transition-all duration-200 ease-out hover:-translate-y-px">
                <Link href={`/chats/${chat.id}`}>
                  {chat.isPinned ? (
                    <Pin className="size-4 shrink-0 stroke-[1.8]" />
                  ) : (
                    <MessageSquare className="size-4 shrink-0 stroke-[1.8]" />
                  )}
                  <span>{chat.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="rounded-xl text-sidebar-foreground/70 transition-all duration-200 ease-out hover:-translate-y-px hover:text-white">
            <Link href="/chats">
              <MoreHorizontal className="stroke-[1.8] text-sidebar-foreground/70" />
              <span>View all chats</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
