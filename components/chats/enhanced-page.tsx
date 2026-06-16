'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Monitor,
  MoreHorizontal,
  Smartphone,
  Share2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tip, TooltipProvider } from '@/components/ui/tooltip'
import { ModeDatabase } from './mode-database'
import { ModeDesign } from './mode-design'
import { ModeCode } from './mode-code'
import { ModeSwitcher, type ChatMode } from './mode-switcher'
import { SettingsPanel } from './settings-panel'
import { SharePanel } from './share-panel'
import { ChatsAppSidebar } from './app-sidebar'
import { useHomeSidebarData } from '@/components/home/use-home-sidebar-data'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ArtifactPreview } from './artifact-preview'
import { WorkspaceProvider, type WorkspacePreviewMode } from './workspace-context'
import type { ArtifactFile } from '@/lib/artifact-analysis'

interface EnhancedPageProps {
  chatId: string
  chatTitle: string
  chatPrompt?: string
  chatModel?: string
  artifactFiles: ArtifactFile[]
  latestMessageId?: string
  children: ReactNode
}

export function EnhancedPage({
  chatId,
  chatTitle,
  chatPrompt,
  chatModel,
  artifactFiles,
  latestMessageId,
}: EnhancedPageProps) {
  const [currentMode, setCurrentMode] = useState<ChatMode>('preview')
  const [pendingMode, setPendingMode] = useState<ChatMode | null>(null)
  const [rightPanel, setRightPanel] = useState<'share' | 'settings' | null>(null)
  const { user, authEnabled, isAuthenticated } = useHomeSidebarData()
  const [designDirty, setDesignDirty] = useState(false)
  const [requestDesignSave, setRequestDesignSave] = useState(0)
  const [previewMode, setPreviewMode] = useState<WorkspacePreviewMode>('web')
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

  const handlePublish = () => {
    if (!latestMessageId) return
    const url = `${window.location.origin}/share/v2/${latestMessageId}`
    void navigator.clipboard?.writeText(url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async () => {
    if (!artifactFiles.length) return
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    artifactFiles.forEach((file) => zip.file(file.path.replace(/^\/+/, ''), file.code))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(chatTitle || 'artifact').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const promptPanel = (
    <aside className="hidden w-[360px] shrink-0 border-r border-border bg-background lg:flex lg:flex-col" aria-label="Prompt and files">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Prompt
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-foreground shadow-sm">
          {chatPrompt || 'No prompt text available.'}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {artifactFiles.slice(0, 8).map((file) => (
            <span key={file.path} className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {file.path}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )

  const renderModeContent = () => {
    if (currentMode === 'code') return <ModeCode chatId={chatId} files={artifactFiles} />
    if (currentMode === 'database') return <ModeDatabase chatId={chatId} files={artifactFiles} />
    if (currentMode === 'design') {
      return (
        <div className="flex h-full min-w-0 overflow-hidden">
          {promptPanel}
          <section className="min-w-0 flex-1 overflow-hidden" aria-label="Live artifact canvas">
            <ArtifactPreview files={artifactFiles} previewMode={previewMode} />
          </section>
          <aside className="hidden w-[380px] shrink-0 overflow-hidden border-l border-border bg-card xl:block" aria-label="Design inspector">
            <ModeDesign
              chatId={chatId}
              files={artifactFiles}
              saveRequest={requestDesignSave}
              onDirtyChange={setDesignDirty}
              onSaved={afterDesignSaved}
            />
          </aside>
        </div>
      )
    }
    return (
      <div className="flex h-full min-w-0 overflow-hidden">
        {promptPanel}
        <section className="min-w-0 flex-1 overflow-hidden" aria-label="Artifact preview">
          <ArtifactPreview files={artifactFiles} previewMode={previewMode} />
        </section>
      </div>
    )
  }

  return (
    <WorkspaceProvider value={{ mode: currentMode, previewMode, hideNestedChrome: true, latestMessageId }}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={false} className="h-dvh overflow-hidden">
          <ChatsAppSidebar
            currentChatId={chatId}
            chats={[]}
            user={user}
            authEnabled={authEnabled}
            isAuthenticated={isAuthenticated}
          />
          <SidebarInset className="min-h-0 overflow-hidden">
            <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden" aria-label="Artifact workspace">
              <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border bg-background px-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <SidebarTrigger className="md:hidden" />
                  <SidebarTrigger className="hidden md:inline-flex" />
                  <div className="min-w-0 truncate text-sm">
                    <span className="font-semibold text-foreground">Hyperspeed</span>
                    <span className="mx-2 text-muted-foreground">/</span>
                    <span className="truncate text-foreground/90">{chatTitle}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ModeSwitcher currentMode={currentMode} onModeChange={requestModeChange} />
                </div>

                <div className="flex min-w-0 items-center justify-end gap-1">
                  <span className="hidden truncate pr-2 text-[11px] text-muted-foreground lg:inline" aria-live="polite">
                    {workspaceTitle} · {fileCount} files
                  </span>
                  {currentMode === 'preview' && (
                    <Tip label={previewMode === 'web' ? 'Switch to mobile preview' : 'Switch to web preview'}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPreviewMode((mode) => (mode === 'web' ? 'mobile' : 'web'))}
                        aria-label={previewMode === 'web' ? 'Switch to mobile preview' : 'Switch to web preview'}
                      >
                        {previewMode === 'web' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      </Button>
                    </Tip>
                  )}
                  <Tip label="Download ZIP">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDownload} aria-label="Download artifact ZIP" disabled={!artifactFiles.length}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </Tip>
                  <Tip label="Publish share link">
                    <Button
                      size="sm"
                      className="hidden h-8 gap-1.5 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-500 sm:inline-flex"
                      onClick={handlePublish}
                      disabled={!latestMessageId}
                      aria-label="Publish share link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Publish
                    </Button>
                  </Tip>
                  <Button variant={rightPanel === 'share' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setRightPanel(rightPanel === 'share' ? null : 'share')} aria-label="Share current artifact" aria-pressed={rightPanel === 'share'}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant={rightPanel === 'settings' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setRightPanel(rightPanel === 'settings' ? null : 'settings')} aria-label="Open artifact menu" aria-pressed={rightPanel === 'settings'}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <section className="min-w-0 flex-1 overflow-hidden" aria-label={`${workspaceTitle} mode`}>
                  {renderModeContent()}
                </section>

                {rightPanel && (
                  <aside className="hidden w-80 shrink-0 overflow-hidden border-l border-border bg-card lg:block" aria-label="Workspace side panel">
                    {rightPanel === 'share' ? (
                      <SharePanel chatId={chatId} onClose={() => setRightPanel(null)} />
                    ) : (
                      <SettingsPanel chatId={chatId} chatTitle={chatTitle} chatModel={chatModel} files={artifactFiles} onClose={() => setRightPanel(null)} />
                    )}
                  </aside>
                )}
              </div>
            </main>

          {rightPanel && (
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] rounded-t-xl border border-border bg-card shadow-2xl lg:hidden" role="dialog" aria-label="Workspace side panel">
              <div className="mx-auto my-2 h-1 w-10 rounded-full bg-border" />
              <div className="h-[calc(70dvh-12px)] overflow-hidden">
                {rightPanel === 'share' ? (
                  <SharePanel chatId={chatId} onClose={() => setRightPanel(null)} />
                ) : (
                  <SettingsPanel chatId={chatId} chatTitle={chatTitle} chatModel={chatModel} files={artifactFiles} onClose={() => setRightPanel(null)} />
                )}
              </div>
            </div>
          )}

          {pendingMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-design-title">
              <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="unsaved-design-title" className="text-sm font-semibold">Unsaved design changes</h2>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPendingMode(null)} aria-label="Stay in design mode">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">Save the live edits before leaving Design mode, or discard the pending changes.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={confirmDiscardDesignChanges}>Discard Changes</Button>
                  <Button size="sm" onClick={confirmSaveDesignChanges}>Save Changes <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          )}
        </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  )
}
