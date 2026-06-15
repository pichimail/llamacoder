'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import type { ArtifactFile } from '@/lib/artifact-analysis'
import { ModeDesign } from './mode-design'

const CodeRunner = dynamic(() => import('@/components/code-runner'), { ssr: false })

type SavedDesignMessage = Parameters<NonNullable<React.ComponentProps<typeof ModeDesign>['onSaved']>>[0]

interface DesignWorkspaceProps {
  chatId: string
  files: ArtifactFile[]
  isStreaming: boolean
  onRequestFix: (error: string) => void
  onPreviewError: (error: string) => void
  onPreviewReady: () => void
  onDirtyChange: (dirty: boolean) => void
  onSaved: (message?: SavedDesignMessage, files?: ArtifactFile[]) => void
}

const MIN_INSPECTOR_WIDTH = 300
const MAX_INSPECTOR_WIDTH = 520

export function DesignWorkspace({
  chatId,
  files,
  isStreaming,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  onDirtyChange,
  onSaved,
}: DesignWorkspaceProps) {
  const [liveFiles, setLiveFiles] = useState(files)
  const [inspectorWidth, setInspectorWidth] = useState(380)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const filesKey = files.map((file) => `${file.path}:${file.code.length}`).join('|')

  useEffect(() => {
    setLiveFiles(files)
  }, [filesKey, files])

  const onSplitterMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: inspectorWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onSplitterKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setInspectorWidth((width) => Math.min(MAX_INSPECTOR_WIDTH, width + step))
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setInspectorWidth((width) => Math.max(MIN_INSPECTOR_WIDTH, width - step))
    }
  }

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - event.clientX
      setInspectorWidth(
        Math.max(
          MIN_INSPECTOR_WIDTH,
          Math.min(MAX_INSPECTOR_WIDTH, dragRef.current.startWidth + delta),
        ),
      )
    }
    const onMouseUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handlePreviewFiles = useCallback((nextFiles: ArtifactFile[]) => {
    setLiveFiles(nextFiles)
  }, [])

  const handleSaved = useCallback(
    (message?: SavedDesignMessage, savedFiles?: ArtifactFile[]) => {
      if (savedFiles?.length) setLiveFiles(savedFiles)
      onSaved(message, savedFiles)
    },
    [onSaved],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
      <section className="min-h-0 flex-1 overflow-hidden bg-background" aria-label="Live design preview">
        {liveFiles.length > 0 ? (
          <CodeRunner
            files={liveFiles.map((file) => ({ path: file.path, content: file.code }))}
            onRequestFix={onRequestFix}
            onPreviewError={onPreviewError}
            onPreviewReady={onPreviewReady}
            showDeviceToggle={false}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            {isStreaming && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
            <p aria-live={isStreaming ? 'polite' : undefined}>
              {isStreaming ? 'Generating your app…' : 'No files yet. Send a prompt to generate an app.'}
            </p>
          </div>
        )}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize design inspector"
        aria-valuemin={MIN_INSPECTOR_WIDTH}
        aria-valuemax={MAX_INSPECTOR_WIDTH}
        aria-valuenow={inspectorWidth}
        tabIndex={0}
        onMouseDown={onSplitterMouseDown}
        onKeyDown={onSplitterKeyDown}
        className="group relative hidden w-[7px] shrink-0 cursor-col-resize bg-transparent focus-visible:outline-none xl:block"
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/60" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 transition group-hover:bg-primary/30 group-focus-visible:bg-primary/40" aria-hidden="true" />
      </div>

      <aside
        style={{ width: inspectorWidth }}
        className="min-h-0 h-[44dvh] shrink-0 overflow-hidden border-t border-border bg-card xl:h-auto xl:border-l xl:border-t-0"
        aria-label="Design inspector"
      >
        <ModeDesign
          chatId={chatId}
          files={files}
          onDirtyChange={onDirtyChange}
          onPreviewFiles={handlePreviewFiles}
          onSaved={handleSaved}
        />
      </aside>
    </div>
  )
}
