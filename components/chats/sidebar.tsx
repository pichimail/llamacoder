'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  MessageSquare,
  Palette,
  Database,
  Plus,
  Search,
  Star,
  Clock,
  Settings,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'

interface Chat {
  id: string
  title: string
  isPinned: boolean
  createdAt: string
}

interface SidebarProps {
  currentChatId?: string
  chats?: Chat[]
  onSelectChat?: (chatId: string) => void
  onNewChat?: () => void
}

export function Sidebar({
  currentChatId,
  chats = [],
  onSelectChat,
  onNewChat,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const pinnedChats = chats.filter((c) => c.isPinned)
  const recentChats = chats.filter((c) => !c.isPinned)

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-64 bg-muted border-r border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-3">
        <h1 className="text-sm font-bold">llamacoder</h1>
        <Button
          onClick={onNewChat}
          size="sm"
          className="w-full h-8 text-xs"
          variant="default"
        >
          <Plus className="w-3 h-3 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Navigation */}
      <div className="px-2 py-3 space-y-1 border-b border-border">
        <NavItem
          icon={<Home className="w-4 h-4" />}
          label="Home"
          onClick={() => {}}
        />
        <NavItem
          icon={<MessageSquare className="w-4 h-4" />}
          label="Chats"
          onClick={() => {}}
          active
        />
        <NavItem icon={<Palette className="w-4 h-4" />} label="Design Systems" />
        <NavItem icon={<Database className="w-4 h-4" />} label="Templates" />
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Chats List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                Pinned
              </h3>
              {pinnedChats
                .filter((c) =>
                  c.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
            </div>
          )}

          {/* Recent Chats */}
          {filteredChats.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                Recent
              </h3>
              {filteredChats
                .filter((c) => !c.isPinned)
                .slice(0, 20)
                .map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
            </div>
          )}

          {filteredChats.length === 0 && searchQuery && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No chats found
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
        <NavItem icon={<LogOut className="w-4 h-4" />} label="Sign Out" />
      </div>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-background'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

interface ChatItemProps {
  chat: Chat
  active?: boolean
  onClick?: () => void
}

function ChatItem({ chat, active, onClick }: ChatItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs truncate group transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-background'
      }`}
    >
      <Clock className="w-3 h-3 flex-shrink-0" />
      <span className="flex-1 truncate">{chat.title}</span>
      {(isHovered || chat.isPinned) && (
        <Star className="w-3 h-3 flex-shrink-0" fill="currentColor" />
      )}
    </button>
  )
}
