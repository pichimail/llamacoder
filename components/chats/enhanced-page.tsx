'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { MoreHorizontal, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModeDatabase } from './mode-database'
import { ModeDesign } from './mode-design'
import { ModeCode } from './mode-code'
import { ModeSwitcher, type ChatMode } from './mode-switcher'
import { SettingsPanel } from './settings-panel'
import { SharePanel } from './share-panel'
import { Sidebar } from './sidebar'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  children: ReactNode
}

export function EnhancedPage({ chatId, chatTitle, children }: EnhancedPageProps) {
  const [currentMode, setCurrentMode] = useState<ChatMode>('preview')
  const [rightPanel, setRightPanel] = useState<'share' | 'settings' | null>(null)

  const renderModeContent = () => {
    switch (currentMode) {
      case 'code':
        return <ModeCode chatId={chatId} />
      case 'design':
        return <ModeDesign chatId={chatId} />
      case 'database':
        return <ModeDatabase chatId={chatId} />
      case 'preview':
      default:
        return children
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentChatId={chatId} chats={[]} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-semibold">llamacoder</span>
              <span className="text-xs text-muted-foreground">/</span>
              <h1 className="text-sm font-medium truncate">{chatTitle}</h1>
            </div>

            <ModeSwitcher currentMode={currentMode} onModeChange={setCurrentMode} />

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setRightPanel(rightPanel === 'share' ? null : 'share')}
                aria-label="Share chat"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setRightPanel(rightPanel === 'settings' ? null : 'settings')}
                aria-label="Open settings"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-hidden">{renderModeContent()}</div>

            {rightPanel && (
              <div className="w-80 border-l border-border overflow-hidden">
                {rightPanel === 'share' ? (
                  <SharePanel chatId={chatId} onClose={() => setRightPanel(null)} />
                ) : (
                  <SettingsPanel chatId={chatId} onClose={() => setRightPanel(null)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
