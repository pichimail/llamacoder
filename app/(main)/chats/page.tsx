import { getChatsList } from '@/app/actions/chat'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ChatsPage() {
  const { pinned, recent } = await getChatsList()
  const chats = [...pinned, ...recent.filter((chat) => !pinned.some((p) => p.id === chat.id))]

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-background">
        <h1 className="text-lg font-semibold">Chats</h1>
        <Link href="/">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="mb-4">No chats yet. Start a new conversation.</p>
            <Link href="/">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Chat
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 p-4 max-w-4xl mx-auto w-full">
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chats/${chat.id}`}>
                <div className="border-b border-border py-4 hover:text-foreground transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium truncate">{chat.title}</h3>
                    {chat.isPinned && (
                      <span className="text-xs text-muted-foreground shrink-0">Pinned</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{chat.prompt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
