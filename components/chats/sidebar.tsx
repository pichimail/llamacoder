'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Home, MessageSquare, Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface SidebarChat {
  id: string
  title: string
  isPinned: boolean
  createdAt: string
  projectName?: string
}

interface SidebarProps {
  currentChatId?: string
  chats?: SidebarChat[]
  onSelectChat?: (chatId: string) => void
  onNewChat?: () => void
}

export function Sidebar({ currentChatId, chats = [], onSelectChat, onNewChat }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return chats.filter((chat) => !query || chat.title.toLowerCase().includes(query))
  }, [chats, searchQuery])

  const grouped = useMemo(() => {
    const map = new Map<string, SidebarChat[]>()
    for (const chat of filteredChats) {
      const key = chat.projectName || 'Personal'
      const list = map.get(key) ?? []
      list.push(chat)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [filteredChats])

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-64'} h-full shrink-0 border-r border-border bg-muted transition-[width] duration-200 flex flex-col overflow-hidden`}
    >
      <div className="h-12 border-b border-border px-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        {!collapsed && <span className="text-sm font-semibold truncate">Hyperspeed</span>}
      </div>

      <div className="p-2 border-b border-border space-y-2">
        <Button onClick={onNewChat} size="sm" className="h-8 w-full justify-start gap-2">
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </Button>

        <nav className="space-y-1" aria-label="Primary">
          <SidebarButton collapsed={collapsed} active={false} icon={<Home className="w-4 h-4" />} label="Home" onClick={onNewChat} />
          <SidebarButton collapsed={collapsed} active icon={<MessageSquare className="w-4 h-4" />} label="Chats" />
        </nav>
      </div>

      {!collapsed && (
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {grouped.map(([projectName, projectChats]) => (
            <div key={projectName} className="space-y-1">
              {!collapsed && (
                <div className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {projectName}
                </div>
              )}
              {projectChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  collapsed={collapsed}
                  active={currentChatId === chat.id}
                  onClick={() => onSelectChat?.(chat.id)}
                />
              ))}
            </div>
          ))}

          {filteredChats.length === 0 && !collapsed && (
            <p className="px-2 py-4 text-xs text-muted-foreground">No chats found.</p>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

function SidebarButton({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'
      } ${collapsed ? 'justify-center' : ''}`}
      aria-label={label}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
}

function ChatItem({
  chat,
  active,
  collapsed,
  onClick,
}: {
  chat: SidebarChat
  active?: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'
      } ${collapsed ? 'justify-center' : ''}`}
      title={chat.title}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate text-left">{chat.title}</span>}
    </button>
  )
}
