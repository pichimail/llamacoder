'use client'

import type { ReactNode } from 'react'

import { ChatsAppSidebar } from '@/components/chats/app-sidebar'
import type { SidebarChat } from '@/components/chats/nav-chats'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  chats: SidebarChat[]
  children: ReactNode
}

export function EnhancedPage({ chatId, chats, children }: EnhancedPageProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <ChatsAppSidebar currentChatId={chatId} chats={chats} />
      <SidebarInset className="h-svh overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  )
}