'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Check, ChevronRight, ImageIcon, Layers, MousePointer2, Palette, Redo2, RefreshCw, Save, Sparkles, Trash2, Type, Undo2, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { ArtifactFile, DesignToken } from '@/lib/artifact-analysis'
import { applyTokenChange, detectDesignTokens, patchFileContent } from '@/lib/artifact-analysis'
import {
  detectElementTargets,
  findElementParent,
  patchElement,
  refreshElementTarget,
  replaceClassToken,
  stripInspectorFromFiles,
  updateElementClassName,
  type ElementTarget,
} from '@/lib/design-inspector'
import { createMessage } from '@/app/(main)/actions'

const DEFAULT_INSTRUCTION_CHIPS = ['/modern', '/contrast', '/spacious', '/simplify', '/readable', '/shadows', '/pop', '/hierarchy']
const fontOptions = ['Geist, sans-serif', 'Satoshi, sans-serif', 'DM Sans, sans-serif', 'Plus Jakarta Sans, sans-serif', 'system-ui', 'Georgia, serif']
const glassOptions = [
  { label: 'Soft frosted', value: 'bg-white/8 backdrop-blur-md border-white/10' },
  { label: 'Deep glass', value: 'bg-black/20 backdrop-blur-xl border-white/15' },
  { label: 'Fractal haze', value: 'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015))] backdrop-blur-lg' },
]

type SavedDesignMessage = Awaited<ReturnType<typeof createMessage>>
type Snapshot = ArtifactFile[]

const SPACING_PRESETS = ['p-0', 'p-2', 'p-4', 'p-6', 'p-8', 'gap-2', 'gap-4', 'gap-6', 'm-0', 'm-4']
const LAYOUT_PRESETS = [
  { label: 'Flex row', value: 'flex flex-row items-center' },
  { label: 'Flex col', value: 'flex flex-col' },
  { label: 'Grid 2', value: 'grid grid-cols-2 gap-4' },
  { label: 'Centered', value: 'flex items-center justify-center' },
  { label: 'Between', value: 'flex items-center justify-between' },
  { label: 'Full width', value: 'w-full' },
]

interface ModeDesignProps {
  chatId: string
  files?: ArtifactFile[]
  saveRequest?: number
  onDirtyChange?: (dirty: boolean) => void
  onPreviewFiles?: (files: ArtifactFile[]) => void
  onSaved?: (message?: SavedDesignMessage, files?: ArtifactFile[]) => void
  inspectorActive?: boolean
  onInspectorActiveChange?: (active: boolean) => void
  onInspectorSelectionChange?: (selection: { tag: string; label: string } | null) => void
  selectedElementId?: string
  onSelectedElementIdChange?: (id: string) => void
}

export function ModeDesign({
  chatId,
  files = [],
  saveRequest = 0,
  onDirtyChange,
  onPreviewFiles,
  onSaved,
  inspectorActive = true,
  onInspectorActiveChange,
  onInspectorSelectionChange,
  selectedElementId: controlledSelectedElementId = '',
  onSelectedElementIdChange,
}: ModeDesignProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [initialFiles, setInitialFiles] = useState(files)
  const [history, setHistory] = useState<Snapshot[]>([files])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedTokenName, setSelectedTokenName] = useState('')
  const [selectedFilePath, setSelectedFilePath] = useState(files[0]?.path || '')
  const [internalSelectedElementId, setInternalSelectedElementId] = useState('')
  const selectedElementId = onSelectedElementIdChange ? controlledSelectedElementId : internalSelectedElementId
  const setSelectedElementId = onSelectedElementIdChange ?? setInternalSelectedElementId
  const layerListRef = useRef<HTMLDivElement | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    setWorkspaceFiles(files)
    setInitialFiles(files)
    setHistory([files])
    setHistoryIndex(0)
    setSelectedFilePath(files[0]?.path || '')
    setSelectedElementId('')
    setDirty(false)
    setInstructions('')
    onDirtyChange?.(false)
    onPreviewFiles?.(files)
  }, [files, onDirtyChange, onPreviewFiles])

  const tokens = useMemo(() => detectDesignTokens(workspaceFiles), [workspaceFiles])
  const elements = useMemo(() => detectElementTargets(workspaceFiles), [workspaceFiles])
  const selectedToken = tokens.find((token) => token.name === selectedTokenName) || tokens[0]
  const selectedFile = workspaceFiles.find((file) => file.path === selectedFilePath) || workspaceFiles[0]
  const selectedElement = selectedElementId
    ? elements.find((element) => element.id === selectedElementId)
    : undefined
  const parentElement = selectedElement ? findElementParent(elements, selectedElement) : null
  const colorTokens = tokens.filter((token) => token.category === 'color')

  useEffect(() => {
    if (!selectedElementId) return
    if (!elements.some((element) => element.id === selectedElementId)) {
      setSelectedElementId('')
    }
  }, [elements, selectedElementId, setSelectedElementId])

  useEffect(() => {
    if (!inspectorActive) {
      onInspectorSelectionChange?.(null)
      return
    }
    if (!selectedElement) {
      onInspectorSelectionChange?.(null)
      return
    }
    onInspectorSelectionChange?.({
      tag: selectedElement.tag,
      label: selectedElement.text || selectedElement.className || selectedElement.filePath,
    })
  }, [inspectorActive, onInspectorSelectionChange, selectedElement])

  useEffect(() => {
    if (!selectedElementId || !layerListRef.current) return
    const node = layerListRef.current.querySelector(`[data-layer-id="${selectedElementId}"]`)
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedElementId])
  const typographyTokens = tokens.filter((token) => token.category === 'typography')
  const spacingTokens = tokens.filter((token) => token.category === 'spacing')
  const radiusTokens = tokens.filter((token) => token.category === 'radius')

  const markDirty = useCallback((nextFiles: ArtifactFile[]) => {
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(nextFiles)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
    setWorkspaceFiles(nextFiles)
    setDirty(true)
    onDirtyChange?.(true)
    onPreviewFiles?.(nextFiles)
  }, [history, historyIndex, onDirtyChange, onPreviewFiles])

  const updateToken = (token: DesignToken, nextValue: string) => {
    const result = applyTokenChange(workspaceFiles, token, nextValue)
    if (result.changed) markDirty(result.files)
  }

  const updateSelectedFile = (nextCode: string) => {
    if (!selectedFile) return
    markDirty(patchFileContent(workspaceFiles, selectedFile.path, nextCode))
  }

  const updateSelectedElementClass = (nextClassName: string) => {
    if (!selectedElement) return
    const nextMatch = updateElementClassName(selectedElement, nextClassName)
    const nextFiles = patchElement(workspaceFiles, selectedElement, nextMatch)
    markDirty(nextFiles)
    const refreshed = refreshElementTarget(nextFiles, selectedElement)
    if (refreshed) setSelectedElementId(refreshed.id)
  }

  const selectElement = (element: ElementTarget) => {
    setSelectedElementId(element.id)
    setSelectedFilePath(element.filePath)
  }

  const selectParentElement = () => {
    if (!parentElement) return
    selectElement(parentElement)
  }

  const appendUtility = (utility: string) => {
    if (selectedElement) {
      updateSelectedElementClass(`${selectedElement.className} ${utility}`.trim())
      return
    }
    if (!selectedFile) return
    const nextCode = selectedFile.code.replace(/className="([^"]*)"/, (match, className) => className.includes(utility) ? match : `className="${className} ${utility}"`)
    if (nextCode !== selectedFile.code) updateSelectedFile(nextCode)
  }

  const replaceUtility = (groups: string[], utility: string) => {
    if (!selectedElement) return
    updateSelectedElementClass(replaceClassToken(selectedElement.className, groups, utility))
  }

  const updateSelectedElementText = (nextText: string) => {
    if (!selectedElement || !selectedElement.text) return
    markDirty(patchElement(workspaceFiles, selectedElement, selectedElement.match.replace(selectedElement.text, nextText)))
  }

  const removeSelectedElement = () => {
    if (!selectedElement) return
    markDirty(patchElement(workspaceFiles, selectedElement, ''))
    setSelectedElementId('')
  }

  const resetChanges = useCallback(() => {
    setWorkspaceFiles(initialFiles)
    setHistory([initialFiles])
    setHistoryIndex(0)
    setDirty(false)
    onDirtyChange?.(false)
    onPreviewFiles?.(initialFiles)
  }, [initialFiles, onDirtyChange, onPreviewFiles])

  const previewChanges = useCallback(() => {
    onPreviewFiles?.(workspaceFiles)
  }, [onPreviewFiles, workspaceFiles])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    const nextFiles = history[nextIndex]
    setHistoryIndex(nextIndex)
    setWorkspaceFiles(nextFiles)
    setDirty(true)
    onDirtyChange?.(true)
    onPreviewFiles?.(nextFiles)
  }, [history, historyIndex, onDirtyChange, onPreviewFiles])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    const nextFiles = history[nextIndex]
    setHistoryIndex(nextIndex)
    setWorkspaceFiles(nextFiles)
    setDirty(true)
    onDirtyChange?.(true)
    onPreviewFiles?.(nextFiles)
  }, [history, historyIndex, onDirtyChange, onPreviewFiles])

  const applyInstructions = () => {
    const text = instructions.trim().toLowerCase()
    if (!text) return
    if (text.includes('contrast')) appendUtility('contrast-125')
    if (text.includes('spacious')) appendUtility('p-8 gap-6')
    if (text.includes('readable')) appendUtility('leading-relaxed tracking-normal')
    if (text.includes('shadow')) appendUtility('shadow-none')
    if (text.includes('pop')) appendUtility('scale-[1.01]')
    if (text.includes('modern')) appendUtility('rounded-xl')
    if (text.includes('simplify')) appendUtility('border border-border/70')
    if (text.includes('hierarchy')) appendUtility('font-semibold')
    setInstructions('')
  }

  const saveDesign = useCallback(() => {
    if (!workspaceFiles.length) return
    startTransition(async () => {
      const cleanedFiles = stripInspectorFromFiles(workspaceFiles)
      const content = 'Design edits saved from the visual artifact editor.\n\n' + cleanedFiles.map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``).join('\n\n')
      const message = await createMessage(chatId, content, 'assistant', cleanedFiles)
      setDirty(false)
      setInitialFiles(cleanedFiles)
      setWorkspaceFiles(cleanedFiles)
      onDirtyChange?.(false)
      onPreviewFiles?.(cleanedFiles)
      onSaved?.(message, cleanedFiles)
      setSavedPulse(true)
      window.setTimeout(() => setSavedPulse(false), 1200)
      router.refresh()
    })
  }, [chatId, onDirtyChange, onPreviewFiles, onSaved, router, workspaceFiles])

  useEffect(() => { if (saveRequest > 0) saveDesign() }, [saveRequest, saveDesign])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo() }
      if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo() }
      if (key === 's') { event.preventDefault(); saveDesign() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, saveDesign, undo])

  if (!workspaceFiles.length) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent p-4 text-center">
        <div className="space-y-2">
          <Palette className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No design surface yet</p>
          <p className="text-xs text-muted-foreground">Generate files first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-transparent text-foreground">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-3">
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant={inspectorActive ? 'outline' : 'ghost'} size="sm" className="h-7 w-7 bg-transparent p-0" onClick={() => onInspectorActiveChange?.(!inspectorActive)} aria-label="Toggle visual inspector">
            <MousePointer2 className="h-3.5 w-3.5" />
          </Button>
          {dirty && <span className="hidden text-[11px] text-amber-500 sm:inline">Unsaved</span>}
          <Button variant="ghost" size="sm" className="h-7 w-7 bg-transparent p-0" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo design change"><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 bg-transparent p-0" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo design change"><Redo2 className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" className="h-7 bg-transparent px-2 text-xs" onClick={saveDesign} disabled={!dirty || isPending} aria-label="Save design changes">
            {savedPulse ? <Check className="mr-1 h-3.5 w-3.5" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="style" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TabsList className="grid h-10 shrink-0 grid-cols-4 rounded-none border-b border-border/70 bg-transparent">
          <TabsTrigger value="style" className="min-w-0 bg-transparent px-1 text-xs"><Palette className="mr-1 h-3 w-3 shrink-0" /><span className="truncate">Style</span></TabsTrigger>
          <TabsTrigger value="type" className="min-w-0 bg-transparent px-1 text-xs"><Type className="mr-1 h-3 w-3 shrink-0" /><span className="truncate">Type</span></TabsTrigger>
          <TabsTrigger value="asset" className="min-w-0 bg-transparent px-1 text-xs"><ImageIcon className="mr-1 h-3 w-3 shrink-0" /><span className="truncate">Asset</span></TabsTrigger>
          <TabsTrigger value="code" className="min-w-0 bg-transparent px-1 text-xs"><Layers className="mr-1 h-3 w-3 shrink-0" /><span className="truncate">Code</span></TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
          <TabsContent value="style" className="m-0 min-w-0 space-y-4 overflow-x-hidden p-3">
            {selectedElement ? (
              <div className="flex min-w-0 items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5 text-[10px] text-muted-foreground">
                <span className="truncate font-mono text-foreground">{selectedElement.filePath}</span>
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate font-mono text-primary">{selectedElement.tag}</span>
                {selectedElement.line ? (
                  <>
                    <ChevronRight className="size-3 shrink-0" />
                    <span>L{selectedElement.line}</span>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border/70 px-2 py-2 text-[11px] text-muted-foreground">
                Click any element in the preview to start inspecting.
              </p>
            )}

            <div className="space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Label className="text-xs">Layers</Label>
                <span className="text-[10px] text-muted-foreground">{elements.length} nodes</span>
              </div>
              <div ref={layerListRef} className="max-h-36 min-w-0 space-y-1 overflow-y-auto overflow-x-hidden rounded-md border border-border/70 bg-transparent p-1">
                {elements.length ? elements.slice(0, 64).map((element) => (
                  <button
                    key={element.id}
                    type="button"
                    data-layer-id={element.id}
                    onClick={() => selectElement(element)}
                    aria-label={`${element.tag}: ${element.text || element.className || element.filePath}`}
                    className={`block w-full rounded px-2 py-1.5 text-left transition hover:bg-accent/40 ${selectedElement?.id === element.id ? 'bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]' : ''}`}
                  >
                    <p className="truncate font-mono text-[11px] text-foreground">{element.tag}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{element.text || element.className || element.filePath}</p>
                  </button>
                )) : <p className="px-2 py-3 text-center text-xs text-muted-foreground">No selectable JSX layers detected.</p>}
              </div>
            </div>

            {selectedElement && (
              <div className="min-w-0 space-y-3 rounded-md border border-border/70 bg-transparent p-2">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs">Selected element</Label>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 bg-transparent px-2 text-[11px]" onClick={selectParentElement} disabled={!parentElement} aria-label="Select parent element">
                      <ArrowUp className="mr-1 h-3 w-3" />Parent
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 bg-transparent p-0 text-red-500" onClick={removeSelectedElement} aria-label="Remove selected element"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <Input value={selectedElement.tag} readOnly className="h-8 bg-transparent font-mono text-xs" aria-label="Selected element tag" />
                <Label className="text-xs">Tailwind classes</Label>
                <Textarea value={selectedElement.className} onChange={(event) => updateSelectedElementClass(event.target.value)} className="min-h-20 max-w-full resize-y overflow-x-hidden bg-transparent font-mono text-xs" aria-label="Edit selected element class utilities" />
                <Label className="text-xs">Layout presets</Label>
                <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2">
                  {LAYOUT_PRESETS.map((preset) => (
                    <Button key={preset.label} variant="outline" size="sm" className="h-7 min-w-0 bg-transparent px-2 text-[11px]" onClick={() => updateSelectedElementClass(`${selectedElement.className} ${preset.value}`.trim())}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Label className="text-xs">Spacing</Label>
                <div className="flex flex-wrap gap-1">
                  {SPACING_PRESETS.map((utility) => (
                    <Button key={utility} variant="outline" size="sm" className="h-6 bg-transparent px-2 text-[10px]" onClick={() => replaceUtility(['p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-', 'm-', 'gap-'], utility)}>
                      {utility}
                    </Button>
                  ))}
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2">
                  {['flex', 'grid', 'hidden', 'relative', 'absolute', 'overflow-hidden', 'rounded-lg', 'border', 'shadow-sm', 'opacity-80'].map((utility) => <Button key={utility} variant="outline" size="sm" className="min-w-0 bg-transparent px-2 text-xs" onClick={() => appendUtility(utility)}>{utility}</Button>)}
                </div>
                {selectedElement.text && (
                  <>
                    <Label className="text-xs">Text content</Label>
                    <Input value={selectedElement.text} onChange={(event) => updateSelectedElementText(event.target.value)} className="h-8 bg-transparent text-xs" aria-label="Edit selected element text" />
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Colors</Label>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {colorTokens.slice(0, 12).map((token) => (
                  <button key={`${token.name}-${token.value}`} onClick={() => setSelectedTokenName(token.name)} className={`rounded-md border border-border/70 bg-transparent p-2 text-left transition hover:border-foreground/30 ${selectedToken?.name === token.name ? 'shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.45)]' : ''}`}>
                    <div className="mb-2 h-8 rounded border border-border/70" style={{ background: token.value }} />
                    <p className="truncate font-mono text-[11px] text-foreground">{token.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{token.value}</p>
                  </button>
                ))}
              </div>
            </div>
            {selectedToken && (
              <div className="space-y-2 border-t border-border/70 pt-3">
                <Label className="text-xs">Selected token</Label>
                <Input value={selectedToken.name} readOnly className="h-8 bg-transparent font-mono text-xs" aria-label="Selected design token name" />
                <Label className="text-xs">Value</Label>
                <Input value={selectedToken.value} onChange={(event) => updateToken(selectedToken, event.target.value)} className="h-8 bg-transparent font-mono text-xs" aria-label="Edit design token value" />
              </div>
            )}
            <div className="space-y-2 border-t border-border/70 pt-3">
              <Label className="text-xs">Glass utilities</Label>
              {glassOptions.map((option) => (
                <Button key={option.label} variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => appendUtility(option.value)}>
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> {option.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="type" className="m-0 min-w-0 space-y-3 overflow-x-hidden p-3">
            <Label className="text-xs">Font family</Label>
            {fontOptions.map((font) => <Button key={font} variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => appendUtility(`font-[${font.replace(/\s+/g, '_')}]`)}>{font}</Button>)}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {['text-xs', 'text-sm', 'text-base', 'text-lg', 'font-medium', 'font-semibold', 'leading-tight', 'leading-relaxed'].map((utility) => (
                <Button key={utility} variant="outline" size="sm" className="bg-transparent text-xs" onClick={() => appendUtility(utility)}>{utility}</Button>
              ))}
            </div>
            {typographyTokens.slice(0, 8).map((token) => (
              <button key={token.name} className="block w-full rounded border border-border/70 bg-transparent p-2 text-left hover:border-foreground/30" onClick={() => setSelectedTokenName(token.name)}>
                <p className="font-mono text-[11px] text-muted-foreground">{token.name}</p>
                <p className="truncate text-sm" style={{ fontFamily: token.value }}>{token.value}</p>
              </button>
            ))}
          </TabsContent>

          <TabsContent value="asset" className="m-0 min-w-0 space-y-3 overflow-x-hidden p-3">
            <p className="text-xs leading-5 text-muted-foreground">Asset controls patch the selected element or file and update the live preview immediately. Save commits them as a new version.</p>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => appendUtility('overflow-hidden')}>Prevent overflow</Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => appendUtility('object-cover')}>Image object-cover</Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => appendUtility('hidden')}>Hide selected</Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent text-xs" onClick={() => replaceUtility(['bg-', 'from-', 'to-'], 'bg-transparent')}>Remove filled background</Button>
          </TabsContent>

          <TabsContent value="code" className="m-0 min-w-0 space-y-3 overflow-x-hidden p-3">
            <Label className="text-xs">File</Label>
            <select value={selectedFile?.path || ''} onChange={(event) => setSelectedFilePath(event.target.value)} className="h-8 w-full rounded-md border border-border/70 bg-transparent px-2 text-xs text-foreground" aria-label="Select file to edit">
              {workspaceFiles.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
            </select>
            <Textarea value={selectedFile?.code || ''} onChange={(event) => updateSelectedFile(event.target.value)} className="min-h-72 resize-y bg-transparent font-mono text-xs text-foreground" spellCheck={false} aria-label="Live edit selected artifact file" />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="shrink-0 border-t border-border/70 bg-background/80 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {DEFAULT_INSTRUCTION_CHIPS.map((chip) => (
            <button key={chip} type="button" onClick={() => setInstructions((value) => `${value} ${chip}`.trim())} className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground">{chip}</button>
          ))}
        </div>
        <Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') applyInstructions() }} placeholder="Add instructions for this element… (⌘↵ to apply)" aria-label="Design instructions for selected element" className="mb-2 min-h-16 max-w-full resize-y overflow-x-hidden bg-transparent text-xs" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" size="sm" onClick={resetChanges} className="bg-transparent text-xs"><RefreshCw className="mr-1 h-3.5 w-3.5" />Reset</Button>
          <Button type="button" variant="outline" size="sm" onClick={previewChanges} className="bg-transparent text-xs"><Eye className="mr-1 h-3.5 w-3.5" />Preview</Button>
          <Button type="button" variant="outline" size="sm" onClick={applyInstructions} className="bg-transparent text-xs"><Check className="mr-1 h-3.5 w-3.5" />Apply</Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <span>{workspaceFiles.length} files</span>
          <span>{[...spacingTokens, ...radiusTokens].length} layout tokens</span>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3 h-9 w-full bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500"
          onClick={saveDesign}
          disabled={!dirty || isPending}
          aria-label="Save design changes to code"
        >
          {savedPulse ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          {isPending ? 'Saving…' : dirty ? 'Save changes to code' : 'Saved'}
        </Button>
      </div>
    </div>
  )
}
