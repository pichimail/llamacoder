'use client'

import { useState } from 'react'
import { ChatMode, useUIStore } from '@/lib/store'
import { updateChatTitle } from '@/app/actions/chats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TooltipProvider, Tip } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  Code,
  Palette,
  Database,
  Share2,
  MoreHorizontal,
  Copy,
  GitBranch,
  Check,
  Pencil,
} from 'lucide-react'

interface TopNavProps {
  chatId: string
  title: string
  onShare: () => void
  onSettings: () => void
}

const modes: Array<{ value: ChatMode; label: string; icon: React.ReactNode }> = [
  { value: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
  { value: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { value: 'design', label: 'Design', icon: <Palette className="w-4 h-4" /> },
  { value: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
]

export function TopNav({ chatId, title, onShare, onSettings }: TopNavProps) {
  const { currentMode, setMode } = useUIStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [isCopied, setIsCopied] = useState(false)

  const handleTitleSave = async () => {
    if (editTitle.trim() && editTitle !== title) {
      try {
        await updateChatTitle(chatId, editTitle)
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to update title:', error)
        setEditTitle(title)
      }
    } else {
      setEditTitle(title)
      setIsEditing(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/chats/${chatId}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left: Mode Switcher */}
        <div className="flex items-center gap-1">
          {modes.map((mode) => (
            <Tip key={mode.value} label={mode.label}>
              <Button
                variant={currentMode === mode.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode(mode.value)}
                className="px-3"
              >
                {mode.icon}
              </Button>
            </Tip>
          ))}
        </div>

        {/* Center: Title Editor */}
        <div className="flex-1 mx-6 flex items-center gap-2">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') {
                  setEditTitle(title)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="h-8"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors flex-1 justify-between"
            >
              <span className="text-sm font-medium truncate">{title}</span>
              <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <Tip label="Share">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="px-3"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </Tip>

          <Tip label={isCopied ? 'Copied!' : 'Copy link'}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="px-3"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </Tip>

          <Tip label="Create PR">
            <Button
              variant="ghost"
              size="sm"
              className="px-3"
            >
              <GitBranch className="w-4 h-4" />
            </Button>
          </Tip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-3">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSettings}>Settings</DropdownMenuItem>
              <DropdownMenuItem>View history</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  )
}
