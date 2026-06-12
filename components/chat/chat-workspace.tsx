'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { TopNav } from './top-nav'
import { PreviewMode } from './modes/preview-mode'
import { CodeMode } from './modes/code-mode'
import { DatabaseMode } from './modes/database-mode'
import { SharePanel } from './panels/share-panel'
import { SettingsPanel } from './panels/settings-panel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

interface ChatWorkspaceProps {
  chatId: string
  title: string
  projectId?: string
}

function LegacyDesignFallback({ chatId, projectId }: { chatId: string; projectId?: string }) {
  const context = [chatId, projectId ?? 'no-project'].join(' / ')

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="h-10 border-b border-border px-4 flex items-center bg-card">
        <span className="text-sm font-medium">Design</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground">Design mode is temporarily limited.</p>
          <p className="text-xs">The visual editor will reconnect after the build is stable.</p>
          <p className="text-[10px] font-mono">{context}</p>
        </div>
      </div>
    </div>
  )
}

export function ChatWorkspace({
  chatId,
  title,
  projectId,
}: ChatWorkspaceProps) {
  const { currentMode, rightPanelOpen, rightPanelTab, setRightPanel } =
    useUIStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    if (mode) {
      return
    }
  }, [])

  const renderModeView = () => {
    switch (currentMode) {
      case 'preview':
        return <PreviewMode chatId={chatId} projectId={projectId} />
      case 'code':
        return <CodeMode chatId={chatId} projectId={projectId} />
      case 'design':
        return <LegacyDesignFallback chatId={chatId} projectId={projectId} />
      case 'database':
        return <DatabaseMode chatId={chatId} projectId={projectId} />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <TopNav
        chatId={chatId}
        title={title}
        onShare={() => {
          setRightPanel(true, 'share')
        }}
        onSettings={() => {
          setRightPanel(true, 'settings')
        }}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={rightPanelOpen ? 75 : 100} minSize={30}>
          {renderModeView()}
        </ResizablePanel>

        {rightPanelOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
              {rightPanelTab === 'share' ? (
                <SharePanel chatId={chatId} title={title} />
              ) : (
                <SettingsPanel chatId={chatId} />
              )}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
