'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'
import Link from 'next/link'

export default function ChatsPage() {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      // Load chats from API or database
      setChats([])
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-background/95 backdrop-blur">
        <h1 className="text-lg font-semibold">Chats</h1>
        <Link href="/chats/new">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="mb-4">No chats yet. Start a new conversation!</p>
            <Link href="/chats/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Chat
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chats/${chat.id}`}>
                <div className="p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                  <h3 className="font-medium">{chat.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{chat.prompt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
