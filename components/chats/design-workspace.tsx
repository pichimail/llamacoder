'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react'
import { Loader2 } from 'lucide-react'

import {
  Cursor,
  CursorFollow,
} from '@/components/animate-ui/components/animate/cursor'
import {
  CursorContainer,
  CursorProvider,
} from '@/components/animate-ui/primitives/animate/cursor'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import type { SandpackBuildOptions } from '@/lib/sandpack-config'
import { DesignInspectorBridge } from './design-inspector-bridge'
import { ModeDesign } from './mode-design'
import type { PreviewMode } from '@/components/code-runner-react'

type InspectorSelection = { tag: string; label: string }

const CodeRunner = dynamic(() => import('@/components/code-runner'), { ssr: false })

type SavedDesignMessage = Parameters<NonNullable<ComponentProps<typeof ModeDesign>['onSaved']>>[0]

interface DesignWorkspaceProps {
  chatId: string
  files: ArtifactFile[]
  isStreaming: boolean
  onRequestFix: (error: string) => void
  onPreviewError: (error: string) => void
  onPreviewReady: () => void
  onDirtyChange: (dirty: boolean) => void
  onSaved: (message?: SavedDesignMessage, files?: ArtifactFile[]) => void
  saveRequest?: number
  previewMode: PreviewMode
  sandpackOptions?: SandpackBuildOptions
}

const MIN_INSPECTOR_WIDTH = 300
const MAX_INSPECTOR_WIDTH = 560

export function DesignWorkspace({
  chatId,
  files,
  isStreaming,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  onDirtyChange,
  onSaved,
  saveRequest = 0,
  previewMode,
  sandpackOptions,
}: DesignWorkspaceProps) {
  const [liveFiles, setLiveFiles] = useState(files)
  const [inspectorWidth, setInspectorWidth] = useState(400)
  const [inspectorActive, setInspectorActive] = useState(true)
  const [selectedElementId, setSelectedElementId] = useState('')
  const [hoverElementId, setHoverElementId] = useState<string | null>(null)
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection | null>(null)
  const previewContainerRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const filesKey = files.map((file) => `${file.path}:${file.code.length}`).join('|')

  useEffect(() => {
    setLiveFiles(files)
    setSelectedElementId('')
    setHoverElementId(null)
  }, [filesKey, files])

  const previewSandpackOptions = useMemo<SandpackBuildOptions>(
    () => ({
      ...sandpackOptions,
      designInspector: inspectorActive,
    }),
    [inspectorActive, sandpackOptions],
  )

  const onSplitterMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: inspectorWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onSplitterKeyDown = (event: KeyboardEvent) => {
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
    const onMouseMove = (event: globalThis.MouseEvent) => {
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

  const handleInspectorSelect = useCallback((id: string) => {
    setSelectedElementId(id)
  }, [])

  const previewFiles = liveFiles.map((file) => ({ path: file.path, content: file.code }))
  const previewRunner = (
    <CodeRunner
      files={previewFiles}
      onRequestFix={onRequestFix}
      onPreviewError={onPreviewError}
      onPreviewReady={onPreviewReady}
      showDeviceToggle={false}
      previewMode={previewMode}
      sandpackOptions={previewSandpackOptions}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent xl:flex-row">
      <section
        ref={previewContainerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-transparent"
        aria-label="Live design preview"
      >
        <DesignInspectorBridge
          enabled={inspectorActive && liveFiles.length > 0}
          selectedElementId={selectedElementId}
          onSelectElement={handleInspectorSelect}
          onHoverElement={setHoverElementId}
          containerRef={previewContainerRef}
        />

        {liveFiles.length > 0 ? (
          inspectorActive ? (
            <CursorProvider global={false}>
              <CursorContainer className="relative h-full w-full">
                {previewRunner}
              </CursorContainer>
              <Cursor className="size-5 text-primary" />
              <CursorFollow className="bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                {inspectorSelection
                  ? `${inspectorSelection.tag}${inspectorSelection.label ? ` · ${inspectorSelection.label}` : ''}`
                  : hoverElementId
                    ? 'Click to inspect'
                    : 'Inspector · click any element'}
              </CursorFollow>
              <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-primary/30 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
                Click elements in the preview to inspect. Edits are live — save to write code.
              </div>
            </CursorProvider>
          ) : (
            previewRunner
          )
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
        className="group relative hidden w-px shrink-0 cursor-col-resize bg-transparent focus-visible:outline-none xl:block"
      >
        <div className="absolute inset-y-0 left-0 w-px bg-border/80 transition group-hover:bg-primary/50 group-focus-visible:bg-primary/60" aria-hidden="true" />
      </div>

      <aside
        style={{ width: inspectorWidth }}
        className="min-h-0 h-[44dvh] shrink-0 overflow-hidden border-t border-border/70 bg-transparent xl:h-auto xl:border-l xl:border-t-0"
        aria-label="Design inspector"
      >
        <ModeDesign
          chatId={chatId}
          files={files}
          onDirtyChange={onDirtyChange}
          onPreviewFiles={handlePreviewFiles}
          onSaved={handleSaved}
          saveRequest={saveRequest}
          inspectorActive={inspectorActive}
          onInspectorActiveChange={setInspectorActive}
          onInspectorSelectionChange={setInspectorSelection}
          selectedElementId={selectedElementId}
          onSelectedElementIdChange={setSelectedElementId}
        />
      </aside>
    </div>
  )
}