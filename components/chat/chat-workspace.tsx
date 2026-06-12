'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { TopNav } from './top-nav'
import { PreviewMode } from './modes/preview-mode'
import { CodeMode } from './modes/code-mode'
import { DesignMode } from './modes/design-mode'
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

export function ChatWorkspace({
  chatId,
  title,
  projectId,
}: ChatWorkspaceProps) {
  const { currentMode, rightPanelOpen, rightPanelTab, setRightPanel } =
    useUIStore()

  useEffect(() => {
    // Handle URL mode parameter
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    if (mode) {
      // Mode will be set via URL params in future enhancement
    }
  }, [])

  const renderModeView = () => {
    switch (currentMode) {
      case 'preview':
        return <PreviewMode chatId={chatId} projectId={projectId} />
      case 'code':
        return <CodeMode chatId={chatId} projectId={projectId} />
      case 'design':
        return <DesignMode chatId={chatId} projectId={projectId} />
      case 'database':
        return <DatabaseMode chatId={chatId} projectId={projectId} />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Top Navigation */}
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

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Main Editor */}
        <ResizablePanel defaultSize={rightPanelOpen ? 75 : 100} minSize={30}>
          {renderModeView()}
        </ResizablePanel>

        {/* Right Panel */}
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
