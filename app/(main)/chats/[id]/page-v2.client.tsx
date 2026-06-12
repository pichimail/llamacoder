'use client'

import { useEffect } from 'react'
import { ChatWorkspace } from '@/components/chat/chat-workspace'
import type { Chat } from './page'

interface PageClientProps {
  chat: Chat
}

export default function PageClientV2({ chat }: PageClientProps) {
  useEffect(() => {
    // Prevent layout shift
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.documentElement.style.overflow = 'auto'
    }
  }, [])

  return (
    <ChatWorkspace
      chatId={chat.id}
      title={chat.title}
      projectId={chat.projectId || undefined}
    />
  )
}
