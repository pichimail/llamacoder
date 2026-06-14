'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModeDatabase } from './mode-database'
import { ModeDesign } from './mode-design'
import { ModeCode } from './mode-code'
import { ModeSwitcher, type ChatMode } from './mode-switcher'
import { SettingsPanel } from './settings-panel'
import { SharePanel } from './share-panel'
import { Sidebar } from './sidebar'
import type { ArtifactFile } from '@/lib/artifact-analysis'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  chatModel?: string
  artifactFiles: ArtifactFile[]
  children: ReactNode
}

export function EnhancedPage({
  chatId,
  chatTitle,
  chatModel,
  artifactFiles,
  children,
}: EnhancedPageProps) {
  const [currentMode, setCurrentMode] = useState<ChatMode>('preview')
  const [pendingMode, setPendingMode] = useState<ChatMode | null>(null)
  const [rightPanel, setRightPanel] = useState<'share' | 'settings' | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [designDirty, setDesignDirty] = useState(false)
  const [requestDesignSave, setRequestDesignSave] = useState(0)
  const fileCount = artifactFiles.length

  const requestModeChange = useCallback(
    (mode: ChatMode) => {
      if (mode === currentMode) return
      if (currentMode === 'design' && designDirty) {
        setPendingMode(mode)
        return
      }
      setCurrentMode(mode)
    },
    [currentMode, designDirty],
  )

  const confirmDiscardDesignChanges = useCallback(() => {
    if (!pendingMode) return
    setDesignDirty(false)
    setCurrentMode(pendingMode)
    setPendingMode(null)
  }, [pendingMode])

  const confirmSaveDesignChanges = useCallback(() => {
    setRequestDesignSave((value) => value + 1)
  }, [])

  const afterDesignSaved = useCallback(() => {
    setDesignDirty(false)
    if (pendingMode) {
      setCurrentMode(pendingMode)
      setPendingMode(null)
    }
  }, [pendingMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const target = event.target as HTMLElement | null
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]')

      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSidebarCollapsed((value) => !value)
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setRightPanel((value) => (value === 'settings' ? null : 'settings'))
      }

      if (!isTyping && event.altKey) {
        const modeFromKey: Record<string, ChatMode> = {
          '1': 'preview',
          '2': 'code',
          '3': 'design',
          '4': 'database',
        }
        const nextMode = modeFromKey[event.key]
        if (nextMode) {
          event.preventDefault()
          requestModeChange(nextMode)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestModeChange])

  const workspaceTitle = useMemo(() => {
    switch (currentMode) {
      case 'code':
        return 'Code'
      case 'design':
        return 'Design'
      case 'database':
        return 'Database'
      case 'preview':
      default:
        return 'Preview'
    }
  }, [currentMode])

  const renderModeContent = () => {
    switch (currentMode) {
      case 'code':
        return <ModeCode chatId={chatId} files={artifactFiles} />
      case 'design':
        return (
          <ModeDesign
            chatId={chatId}
            files={artifactFiles}
            saveRequest={requestDesignSave}
            onDirtyChange={setDesignDirty}
            onSaved={afterDesignSaved}
          />
        )
      case 'database':
        return <ModeDatabase chatId={chatId} files={artifactFiles} />
      case 'preview':
      default:
        return children
    }
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full overflow-hidden">
        <Sidebar
          currentChatId={chatId}
          chats={[]}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Artifact workspace">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 md:hidden"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 w-8 p-0 md:inline-flex"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="hidden font-semibold sm:inline">Hyperspeed</span>
                  <span className="hidden text-muted-foreground sm:inline">/</span>
                  <h1 className="truncate font-medium">{chatTitle}</h1>
                </div>
                <p className="truncate text-[11px] text-muted-foreground md:hidden">
                  {workspaceTitle} · {fileCount} files
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-3 md:flex">
              <ModeSwitcher currentMode={currentMode} onModeChange={requestModeChange} />
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden text-[11px] text-muted-foreground lg:block" aria-live="polite">
                {workspaceTitle} · {fileCount} files
              </div>
              <Button
                variant={rightPanel === 'share' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setRightPanel(rightPanel === 'share' ? null : 'share')}
                aria-label="Share current artifact"
                aria-pressed={rightPanel === 'share'}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant={rightPanel === 'settings' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setRightPanel(rightPanel === 'settings' ? null : 'settings')}
                aria-label="Open artifact settings"
                aria-pressed={rightPanel === 'settings'}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="border-b border-border bg-card/80 px-2 py-1 md:hidden">
            <ModeSwitcher currentMode={currentMode} onModeChange={requestModeChange} compact />
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="min-w-0 flex-1 overflow-hidden" aria-label={`${workspaceTitle} mode`}>
              {renderModeContent()}
            </section>

            {rightPanel && (
              <aside className="hidden w-80 shrink-0 overflow-hidden border-l border-border bg-card lg:block" aria-label="Workspace side panel">
                {rightPanel === 'share' ? (
                  <SharePanel chatId={chatId} onClose={() => setRightPanel(null)} />
                ) : (
                  <SettingsPanel
                    chatId={chatId}
                    chatTitle={chatTitle}
                    chatModel={chatModel}
                    files={artifactFiles}
                    onClose={() => setRightPanel(null)}
                  />
                )}
              </aside>
            )}
          </div>
        </main>
      </div>

      {rightPanel && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] rounded-t-xl border border-border bg-card shadow-2xl lg:hidden" role="dialog" aria-label="Workspace side panel">
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-border" />
          <div className="h-[calc(70dvh-12px)] overflow-hidden">
            {rightPanel === 'share' ? (
              <SharePanel chatId={chatId} onClose={() => setRightPanel(null)} />
            ) : (
              <SettingsPanel
                chatId={chatId}
                chatTitle={chatTitle}
                chatModel={chatModel}
                files={artifactFiles}
                onClose={() => setRightPanel(null)}
              />
            )}
          </div>
        </div>
      )}

      {pendingMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="unsaved-design-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="unsaved-design-title" className="text-sm font-semibold">Unsaved design changes</h2>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPendingMode(null)} aria-label="Stay in design mode">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Save the live edits before leaving Design mode, or discard the pending changes.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={confirmDiscardDesignChanges}>
                Discard Changes
              </Button>
              <Button size="sm" onClick={confirmSaveDesignChanges}>
                Save Changes <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
