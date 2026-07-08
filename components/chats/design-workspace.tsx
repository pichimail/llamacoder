'use client'

import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { ChevronLeft, ChevronRight, Monitor, RefreshCw, Smartphone, Tablet, ZoomIn, ZoomOut, History, Settings2 } from 'lucide-react'

import type { ArtifactFile } from '@/lib/artifact-analysis'
import type { SandpackBuildOptions } from '@/lib/sandpack-config'
import type { InspectorTreeNode } from '@/lib/design-inspector'
import { DesignInspectorBridge } from './design-inspector-bridge'
import { ModeDesign } from './mode-design'
import type { PreviewMode } from '@/components/code-runner-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CodeRunner = dynamic(() => import('@/components/code-runner'), { ssr: false })

type InspectorSelection = { tag: string; label: string }

type SavedDesignMessage = Parameters<NonNullable<ComponentProps<typeof ModeDesign>['onSaved']>>[0]

interface DesignWorkspaceProps {
  chatId: string
  chatModel?: string
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
  /** When provided, the design-tool controls (typography/color/layout inspector)
   * are portaled into this element instead of rendering in a local right-side
   * column — used so the chat composer slot can swap to design controls while
   * Design mode is active, instead of stacking a second panel next to it. */
  controlsPortalTarget?: HTMLElement | null
}

export function DesignWorkspace({
  chatId,
  chatModel,
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
  controlsPortalTarget,
}: DesignWorkspaceProps) {
  const [liveFiles, setLiveFiles] = useState(files)
  const [inspectorActive, setInspectorActive] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [zoom, setZoom] = useState(1)
  const [selectedElementId, setSelectedElementId] = useState('')
  const [, setInspectorSelection] = useState<InspectorSelection | null>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [tree, setTree] = useState<InspectorTreeNode[]>([])
  const [leftView, setLeftView] = useState<'layers' | 'history'>('layers')
  const [hoverElementId, setHoverElementId] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const filesKey = files.map((f) => `${f.path}:${f.code.length}`).join('|')

  useEffect(() => {
    setLiveFiles(files)
    setSelectedElementId('')
    setHoverElementId(null)
  }, [filesKey, files])

  // Load checkpoints on mount
  useEffect(() => {
    fetch(`/api/design/${chatId}`).then(r => r.json()).then(d => {
      if (d.checkpoints) setCheckpoints(d.checkpoints)
    }).catch(() => {})
  }, [chatId])

  const previewSandpackOptions = useMemo<SandpackBuildOptions>(() => ({
    ...sandpackOptions,
    designInspector: inspectorActive,
  }), [inspectorActive, sandpackOptions])

  const handlePreviewFiles = useCallback((next: ArtifactFile[]) => {
    setLiveFiles(next)
  }, [])

  const handleSaved = useCallback((message?: SavedDesignMessage, saved?: ArtifactFile[]) => {
    if (saved?.length) setLiveFiles(saved)
    onSaved(message, saved)
  }, [onSaved])

  const handleInspectorSelect = useCallback((id: string) => setSelectedElementId(id), [])

  const previewFiles = liveFiles.map((f) => ({ path: f.path, content: f.code }))

  const reloadPreview = () => {
    // trigger runner reload by key bump via parent if needed; simple state nudge
    setLiveFiles([...liveFiles])
  }

  const changeZoom = (delta: number) => setZoom(z => Math.max(0.4, Math.min(2, +(z + delta).toFixed(1))))

  const setDevice = (d: 'desktop' | 'tablet' | 'mobile') => {
    setViewport(d)
    if (d === 'mobile') setZoom(0.9)
    if (d === 'tablet') setZoom(0.85)
    if (d === 'desktop') setZoom(1)
  }

  const containerStyle = useMemo(() => {
    let w = 1200
    if (viewport === 'tablet') w = 768
    if (viewport === 'mobile') w = 390
    return { width: `${Math.round(w * zoom)}px`, height: viewport === 'mobile' ? `${Math.round(780 * zoom)}px` : '100%' }
  }, [viewport, zoom])

  const previewPane = (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-muted/40">
      {/* Top chrome: viewport controls */}
      <div className="flex h-9 items-center justify-between border-b border-border/60 bg-background/95 px-2 text-xs">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setLeftOpen(!leftOpen)} title="Toggle history">
            <History className="size-3.5" />
          </Button>
          <div className="ml-1 flex items-center gap-1 rounded bg-muted/40 p-0.5">
            <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-1.5" onClick={() => setDevice('desktop')}><Monitor className="size-3.5" /></Button>
            <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-1.5" onClick={() => setDevice('tablet')}><Tablet className="size-3.5" /></Button>
            <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-1.5" onClick={() => setDevice('mobile')}><Smartphone className="size-3.5" /></Button>
          </div>
          <div className="ml-1 flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => changeZoom(-0.1)}><ZoomOut className="size-3.5" /></Button>
            <span className="w-8 text-center tabular-nums text-[10px]">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => changeZoom(0.1)}><ZoomIn className="size-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={reloadPreview}><RefreshCw className="size-3.5" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="hidden sm:inline">Design Mode</span>
          {!controlsPortalTarget && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setRightOpen(!rightOpen)} title="Toggle inspector">
              <Settings2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Dominant center canvas */}
      <div
        ref={previewContainerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-2 sm:p-4 bg-muted/60 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px]"
      >
        <div
          className="relative origin-top-left overflow-hidden rounded-lg border border-border/60 bg-background shadow-xl"
          style={containerStyle}
        >
          <DesignInspectorBridge
            enabled={inspectorActive && liveFiles.length > 0}
            selectedElementId={selectedElementId}
            onSelectElement={handleInspectorSelect}
            onHoverElement={setHoverElementId}
            onTreeUpdate={setTree}
            containerRef={previewContainerRef as any}
          />
          {liveFiles.length > 0 ? (
            <CodeRunner
              key={viewport + zoom}
              files={previewFiles}
              onRequestFix={onRequestFix}
              onPreviewError={onPreviewError}
              onPreviewReady={onPreviewReady}
              showDeviceToggle={false}
              previewMode={previewMode}
              sandpackOptions={previewSandpackOptions}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              {isStreaming ? 'Generating preview…' : 'Send a prompt to generate an app.'}
            </div>
          )}
        </div>

        {/* subtle status */}
        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
          {viewport} · {liveFiles.length} files
        </div>
      </div>
    </div>
  )

  const leftRail = (
    <div className={cn("flex h-full shrink-0 flex-col border-r border-border/60 bg-background/95", leftOpen ? "w-56" : "w-10")}>
      <div className="flex h-9 items-center justify-between border-b px-2 text-xs">
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-1 text-muted-foreground hover:text-foreground" onClick={() => setLeftOpen(!leftOpen)}>
          {leftOpen ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
        </Button>
        {leftOpen && (
          <div className="flex items-center gap-0.5 rounded bg-muted/40 p-0.5">
            <Button variant={leftView === 'layers' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setLeftView('layers')}>Layers</Button>
            <Button variant={leftView === 'history' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setLeftView('history')}>History</Button>
          </div>
        )}
      </div>
      {leftOpen && leftView === 'layers' && (
        <div className="flex-1 overflow-auto p-1.5 text-xs">
          {tree.length === 0 && (
            <div className="p-2 text-muted-foreground">
              {liveFiles.length === 0 ? 'Generate an app to see its layer tree.' : 'Loading layers…'}
            </div>
          )}
          {tree.map((node) => (
            <button
              key={node.id}
              data-layer-id={node.id}
              onClick={() => setSelectedElementId(node.id)}
              onMouseEnter={() => setHoverElementId(node.id)}
              onMouseLeave={() => setHoverElementId((current) => (current === node.id ? null : current))}
              className={cn(
                "flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left font-mono text-[11px] transition-colors",
                selectedElementId === node.id
                  ? "bg-primary/15 text-primary"
                  : hoverElementId === node.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              style={{ paddingLeft: `${6 + node.depth * 12}px` }}
              title={node.text || node.className}
            >
              <span className="shrink-0 opacity-60">{node.tag}</span>
              {node.text && <span className="truncate opacity-50">{node.text}</span>}
            </button>
          ))}
        </div>
      )}
      {leftOpen && leftView === 'history' && (
        <div className="flex-1 overflow-auto p-2 text-xs">
          <div className="mb-2 font-mono text-[10px] text-muted-foreground">CHECKPOINTS</div>
          {checkpoints.length === 0 && <div className="text-muted-foreground">No checkpoints yet. Use Save in inspector.</div>}
          {checkpoints.map((cp) => (
            <Button key={cp.id} variant="outline" size="sm" className="mb-1 h-auto w-full justify-start truncate px-2 py-1 text-left text-xs font-normal" onClick={async () => {
              await fetch(`/api/design/${chatId}/restore`, { method: 'POST', body: JSON.stringify({ checkpointId: cp.id }) })
              window.location.reload()
            }}>
              {cp.name} · {new Date(cp.createdAt).toLocaleTimeString()}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="mt-2 h-auto w-full justify-start px-2 py-1 text-left text-xs font-normal" onClick={async () => {
            const res = await fetch(`/api/design/${chatId}/checkpoint`, { method: 'POST', body: JSON.stringify({ name: 'manual' }) })
            const j = await res.json()
            setCheckpoints([j, ...checkpoints])
          }}>Create checkpoint</Button>
        </div>
      )}
    </div>
  )

  const inspectorPane = (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-background/95",
        controlsPortalTarget ? "border-t border-border/60" : "border-l border-border/60",
        !controlsPortalTarget && !rightOpen && "hidden xl:block",
      )}
    >
      <ModeDesign
        chatId={chatId}
        chatModel={chatModel}
        files={files}
        tree={tree}
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
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background text-foreground">
      {/* Left history rail (collapsible) */}
      <div className="hidden shrink-0 border-r md:block">{leftRail}</div>

      {/* Center column: dominant preview canvas + the mobile inspector sheet
          stacked BELOW it (previously the sheet sat in the horizontal flex row,
          which rendered it as a squeezed right-hand column instead of a
          bottom sheet on small screens). */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{previewPane}</div>

        {/* Mobile inspector bottom sheet (always local — the composer slot
            isn't visible on mobile while Design mode is active). */}
        <div className="shrink-0 border-t xl:hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between bg-background px-3 py-2 text-xs font-medium">
              Inspector
              <span className="text-muted-foreground group-open:hidden">tap to open</span>
            </summary>
            <div className="h-[42vh] overflow-auto border-t">{inspectorPane}</div>
          </details>
        </div>
      </div>

      {/* Right inspector: portaled into the chat composer slot when available
          (desktop) so the controls replace the composer instead of stacking a
          second panel next to it; falls back to a local collapsible column
          when no portal target was supplied. */}
      {controlsPortalTarget ? (
        createPortal(inspectorPane, controlsPortalTarget)
      ) : (
        <div className="hidden min-w-0 shrink-0 border-l xl:block" style={{ width: rightOpen ? 'min(380px, 28vw)' : '0' }}>
          {rightOpen && inspectorPane}
        </div>
      )}
    </div>
  )
}
