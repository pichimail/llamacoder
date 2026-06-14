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
  X,
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
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  onToggleCollapse?: () => void
}

export function Sidebar({
  currentChatId,
  chats = [],
  onSelectChat,
  onNewChat,
  collapsed = true,
  mobileOpen = false,
  onMobileOpenChange,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const pinnedChats = chats.filter((c) => c.isPinned)
  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const content = (
    <div
      className={`flex h-full flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
      aria-label="Chat sidebar"
    >
      <div className="space-y-3 border-b border-border p-2">
        <div className="flex h-8 items-center justify-between gap-2">
          {!collapsed && <h1 className="truncate text-sm font-bold">llamacoder</h1>}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => onMobileOpenChange?.(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewChat ?? (() => (window.location.href = '/'))}
          size="sm"
          className="h-8 w-full text-xs"
          variant="default"
          aria-label="Create new chat"
        >
          <Plus className={collapsed ? 'h-4 w-4' : 'mr-2 h-3 w-3'} />
          {!collapsed && 'New Chat'}
        </Button>
      </div>

      <nav className="space-y-1 border-b border-border px-2 py-3" aria-label="Primary navigation">
        <NavItem icon={<Home className="h-4 w-4" />} label="Home" collapsed={collapsed} onClick={() => (window.location.href = '/')} />
        <NavItem icon={<MessageSquare className="h-4 w-4" />} label="Chats" collapsed={collapsed} active />
        <NavItem icon={<Palette className="h-4 w-4" />} label="Design" collapsed={collapsed} disabled />
        <NavItem icon={<Database className="h-4 w-4" />} label="Templates" collapsed={collapsed} disabled />
      </nav>

      {!collapsed && (
        <div className="border-b border-border px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
              aria-label="Search chats"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-2">
          {!collapsed && pinnedChats.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">Pinned</h3>
              {pinnedChats
                .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    collapsed={collapsed}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
            </div>
          )}

          {!collapsed && filteredChats.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">Recent</h3>
              {filteredChats
                .filter((c) => !c.isPinned)
                .slice(0, 20)
                .map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    collapsed={collapsed}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
            </div>
          )}

          {!collapsed && filteredChats.length === 0 && searchQuery && (
            <p className="py-4 text-center text-xs text-muted-foreground">No chats found</p>
          )}
        </div>
      </ScrollArea>

      <div className="space-y-1 border-t border-border p-2">
        <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" collapsed={collapsed} disabled />
        <NavItem icon={<LogOut className="h-4 w-4" />} label="Sign Out" collapsed={collapsed} disabled />
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden md:block">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile sidebar">
          <button
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => onMobileOpenChange?.(false)}
            aria-label="Close sidebar overlay"
          />
          <div className="absolute inset-y-0 left-0 w-64">{content}</div>
        </div>
      )}
    </>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  collapsed?: boolean
  disabled?: boolean
}

function NavItem({ icon, label, active, onClick, collapsed, disabled }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-background hover:text-foreground'
      }`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

interface ChatItemProps {
  chat: Chat
  active?: boolean
  onClick?: () => void
  collapsed?: boolean
}

function ChatItem({ chat, active, onClick, collapsed }: ChatItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-background hover:text-foreground'
      }`}
      title={chat.title}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {!collapsed && <span className="flex-1 truncate text-left">{chat.title}</span>}
      {!collapsed && (isHovered || chat.isPinned) && <Star className="h-3 w-3 shrink-0" fill="currentColor" />}
    </button>
  )
}
