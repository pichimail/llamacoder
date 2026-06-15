"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquare, Pin } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface SidebarChat {
  id: string
  title: string
  isPinned: boolean
  createdAt: string
  projectName?: string
}

export function NavChats({
  chats,
  currentChatId,
}: {
  chats: SidebarChat[]
  currentChatId?: string
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const grouped = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = chats.filter(
      (chat) => !query || chat.title.toLowerCase().includes(query),
    )
    const map = new Map<string, SidebarChat[]>()

    for (const chat of filtered) {
      const key = chat.projectName || "Personal"
      const list = map.get(key) ?? []
      list.push(chat)
      map.set(key, list)
    }

    return Array.from(map.entries())
  }, [chats, searchQuery])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarInput
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {grouped.map(([projectName, projectChats]) => (
          <SidebarMenu key={projectName}>
            <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground">
              {projectName}
            </p>
            {projectChats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentChatId === chat.id}
                  tooltip={chat.title}
                >
                  <Link href={`/chats/${chat.id}`}>
                    {chat.isPinned ? (
                      <Pin className="size-4 shrink-0" />
                    ) : (
                      <MessageSquare className="size-4 shrink-0" />
                    )}
                    <span>{chat.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ))}
        {grouped.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">No chats found.</p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}