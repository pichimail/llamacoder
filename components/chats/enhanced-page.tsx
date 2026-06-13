'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { Sidebar, type SidebarChat } from './sidebar'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  chats: SidebarChat[]
  children: ReactNode
}

export function EnhancedPage({ chatId, chats, children }: EnhancedPageProps) {
  const router = useRouter()

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="hidden h-full shrink-0 md:block">
          <Sidebar
            currentChatId={chatId}
            chats={chats}
            onSelectChat={(nextChatId) => router.push(`/chats/${nextChatId}`)}
            onNewChat={() => router.push('/')}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
