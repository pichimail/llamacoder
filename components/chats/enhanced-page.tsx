'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ModeSwitcher, type ChatMode } from './mode-switcher'
import { ModeCode } from './mode-code'
import { ModeDesign } from './mode-design'
import { ModeDatabase } from './mode-database'
import { Button } from '@/components/ui/button'
import { Share2, MoreHorizontal } from 'lucide-react'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  children: ReactNode // The real page.client JSX
}

export function EnhancedPage({ chatId, chatTitle, children }: EnhancedPageProps) {
  const [currentMode, setCurrentMode] = useState<ChatMode>('preview')

  const renderModeContent = () => {
    switch (currentMode) {
      case 'preview':
        // Show the real page.client content
        return children
      case 'code':
        return <ModeCode chatId={chatId} />
      case 'design':
        return <ModeDesign chatId={chatId} />
      case 'database':
        return <ModeDatabase chatId={chatId} />
      default:
        return children
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-semibold">llamacoder</span>
          <span className="text-xs text-muted-foreground">•</span>
          <h1 className="text-sm font-medium truncate">{chatTitle}</h1>
        </div>

        {/* Center: Mode Switcher */}
        <ModeSwitcher currentMode={currentMode} onModeChange={setCurrentMode} />

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-4">
          <Button variant="ghost" size="sm" className="h-8">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{renderModeContent()}</div>
    </div>
  )
}
