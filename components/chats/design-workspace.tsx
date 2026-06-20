'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

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
  const [inspectorActive, setInspectorActive] = useState(true)
  const [selectedElementId, setSelectedElementId] = useState('')
  const [hoverElementId, setHoverElementId] = useState<string | null>(null)
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection | null>(null)
  const previewContainerRef = useRef<HTMLElement | null>(null)
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
    <div className="h-full min-h-0 w-full min-w-0 overflow-hidden">
      <CodeRunner
        files={previewFiles}
        onRequestFix={onRequestFix}
        onPreviewError={onPreviewError}
        onPreviewReady={onPreviewReady}
        showDeviceToggle={false}
        previewMode={previewMode}
        sandpackOptions={previewSandpackOptions}
      />
    </div>
  )

  const previewPane = (
    <section
      ref={previewContainerRef}
      className="relative h-full min-h-0 w-full min-w-0 overflow-hidden bg-transparent"
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
            <CursorContainer className="relative h-full w-full min-w-0 overflow-hidden">
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
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(34rem,calc(100%-1.5rem))] rounded-md border border-primary/30 bg-background/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
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
  )

  const inspectorPane = (
    <aside
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background/95 text-foreground shadow-[inset_1px_0_0_hsl(var(--border)/0.8)]"
      aria-label="Design inspector panel"
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
  )

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-transparent">
      <div
        className="hidden h-full min-h-0 min-w-0 overflow-hidden xl:grid"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) 1px clamp(340px, 28vw, 430px)' }}
      >
        <div className="min-h-0 min-w-0 overflow-hidden">
          {previewPane}
        </div>
        <div aria-hidden="true" className="h-full w-px bg-border/70" />
        <div className="min-h-0 min-w-0 overflow-hidden">
          {inspectorPane}
        </div>
      </div>

      <ResizablePanelGroup id="design-workspace-mobile-split" orientation="vertical" className="h-full min-h-0 xl:hidden">
        <ResizablePanel id="design-preview-mobile" defaultSize={62} minSize={35} className="min-h-0 overflow-hidden">
          {previewPane}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="design-inspector-mobile" defaultSize={38} minSize={24} className="min-h-0 overflow-hidden border-t border-border/70">
          {inspectorPane}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
