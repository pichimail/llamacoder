"use client"

import type { SidebarChat } from "@/components/chats/nav-chats"
import type { HomeSidebarUser } from "@/components/home/use-home-sidebar-data"
import type { Sidebar } from "@/components/ui/sidebar"

export function ChatsAppSidebar(_props: React.ComponentProps<typeof Sidebar> & {
  currentChatId?: string
  chats?: SidebarChat[]
  user: HomeSidebarUser
  authEnabled?: boolean
  isAuthenticated?: boolean
}) {
  return null
}
