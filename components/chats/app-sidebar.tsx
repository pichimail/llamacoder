"use client"

import type { SidebarChat } from "@/components/chats/nav-chats"
import type { HomeSidebarUser } from "@/components/home/use-home-sidebar-data"

export function ChatsAppSidebar(_props: {
  currentChatId?: string
  chats?: SidebarChat[]
  user: HomeSidebarUser
  authEnabled?: boolean
  isAuthenticated?: boolean
}) {
  return null
}
