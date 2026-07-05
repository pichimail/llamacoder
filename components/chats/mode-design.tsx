'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Redo2, Save,
  Sparkles, Strikethrough, Underline, Undo2, Eye, RotateCcw, CaseUpper, CaseLower,
  CaseSensitive, ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import {
  applyClassProperty,
  detectElementTargets,
  patchElement,
  readClassProperty,
  refreshElementTarget,
  stripInspectorFromFiles,
  STYLE_PROPERTY_MATCHERS,
  updateElementClassName,
  type InspectorTreeNode,
} from '@/lib/design-inspector'
import { createMessage } from '@/app/(main)/actions'
import { getFallbackModel } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DEFAULT_INSTRUCTION_CHIPS = ['/modern', '/contrast', '/spacious', '/simplify', '/readable', '/shadows', '/pop', '/hierarchy']
const FONT_FAMILY_OPTIONS = [
  { label: 'Default (inherit)', value: '' },
  { label: 'Geist', value: 'Geist, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Satoshi', value: 'Satoshi, sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'System UI', value: 'system-ui' },
  { label: 'Georgia (serif)', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
]
const FONT_WEIGHT_OPTIONS = [
  { label: 'Thin', value: 'font-thin' },
  { label: 'Light', value: 'font-light' },
  { label: 'Regular', value: 'font-normal' },
  { label: 'Medium', value: 'font-medium' },
  { label: 'Semibold', value: 'font-semibold' },
  { label: 'Bold', value: 'font-bold' },
  { label: 'Extrabold', value: 'font-extrabold' },
  { label: 'Black', value: 'font-black' },
]
const DISPLAY_OPTIONS = ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden']

type SavedDesignMessage = Awaited<ReturnType<typeof createMessage>>
type Snapshot = ArtifactFile[]

interface ModeDesignProps {
  chatId: string
  chatModel?: string
  files?: ArtifactFile[]
  tree?: InspectorTreeNode[]
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

/** Reads current inline/box-model-relevant pixel values by scanning the
 * element's className for our arbitrary-value spacing tokens (mt-[Npx] etc). */
function readPx(className: string, matcher: (t: string) => boolean): string {
  const token = readClassProperty(className, matcher)
  if (!token) return ''
  const match = token.match(/\[([\d.]+)px\]/)
  return match ? match[1] : ''
}

/** Reads a hex color value from a text-[#xxxxxx] or bg-[#xxxxxx] token. */
function readHex(className: string, matcher: (t: string) => boolean, fallback: string): string {
  const token = readClassProperty(className, matcher)
  if (!token) return fallback
  const match = token.match(/#([0-9a-fA-F]{3,8})/)
  return match ? `#${match[1]}` : fallback
}

export function ModeDesign({
  chatId,
  chatModel,
  files = [],
  tree = [],
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
  const [isSendingInstruction, setIsSendingInstruction] = useState(false)
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [initialFiles, setInitialFiles] = useState(files)
  const [history, setHistory] = useState<Snapshot[]>([files])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [internalSelectedElementId, setInternalSelectedElementId] = useState('')
  const selectedElementId = onSelectedElementIdChange ? controlledSelectedElementId : internalSelectedElementId
  const setSelectedElementId = onSelectedElementIdChange ?? setInternalSelectedElementId
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    setWorkspaceFiles(files)
    setInitialFiles(files)
    setHistory([files])
    setHistoryIndex(0)
    setSelectedElementId('')
    setDirty(false)
    setInstructions('')
    onDirtyChange?.(false)
    onPreviewFiles?.(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const elements = useMemo(() => detectElementTargets(workspaceFiles), [workspaceFiles])
  const selectedElement = selectedElementId
    ? elements.find((element) => element.id === selectedElementId)
    : undefined

  useEffect(() => {
    if (!selectedElementId) return
    if (!elements.some((element) => element.id === selectedElementId)) {
      setSelectedElementId('')
    }
  }, [elements, selectedElementId, setSelectedElementId])

  useEffect(() => {
    if (!inspectorActive || !selectedElement) {
      onInspectorSelectionChange?.(null)
      return
    }
    onInspectorSelectionChange?.({
      tag: selectedElement.tag,
      label: selectedElement.text || selectedElement.className || selectedElement.filePath,
    })
  }, [inspectorActive, onInspectorSelectionChange, selectedElement])

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

  const updateSelectedElementClass = useCallback((nextClassName: string) => {
    if (!selectedElement) return
    const nextMatch = updateElementClassName(selectedElement, nextClassName)
    const nextFiles = patchElement(workspaceFiles, selectedElement, nextMatch)
    markDirty(nextFiles)
    const refreshed = refreshElementTarget(nextFiles, selectedElement)
    if (refreshed) setSelectedElementId(refreshed.id)
  }, [markDirty, selectedElement, setSelectedElementId, workspaceFiles])

  /** Sets exactly one property on the selected element via its matcher
   * predicate — the precise, non-conflating style editing primitive that
   * every control below (typography, color, layout) is built on. */
  const setProperty = useCallback((matcher: (t: string) => boolean, nextToken: string | null) => {
    if (!selectedElement) return
    updateSelectedElementClass(applyClassProperty(selectedElement.className, matcher, nextToken))
  }, [selectedElement, updateSelectedElementClass])

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

  const saveDesign = useCallback(() => {
    if (!workspaceFiles.length) return
    startTransition(async () => {
      const cleanedFiles = stripInspectorFromFiles(workspaceFiles)
      const content = 'Design edits saved from the visual inspector.\n\n' + cleanedFiles.map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``).join('\n\n')
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

  /**
   * Sends the free-text instruction as a SCOPED follow-up prompt — targeting
   * only the selected element/component, not a full app regeneration. This
   * deliberately reuses the exact same message + `?generate=` pipeline every
   * other chat turn goes through (including the truncation/continuation
   * handling), rather than a parallel code-generation path.
   */
  const sendScopedInstruction = useCallback(async () => {
    const text = instructions.trim()
    if (!text) return
    setIsSendingInstruction(true)
    try {
      const target = selectedElement
      const scopedPrompt = target
        ? `Scoped design edit — apply this ONLY to the <${target.tag}> element in ${target.filePath}` +
          `${target.text ? ` (containing text: "${target.text}")` : ''}. ` +
          `Current classes: \`${target.className || '(none)'}\`. ` +
          `Do not modify any other file or component. Instruction: ${text}`
        : `Scoped design edit for the current app. Instruction: ${text}`

      const message = await createMessage(chatId, scopedPrompt, 'user')
      const model = chatModel || getFallbackModel().value
      setInstructions('')
      router.push(`/chats/${chatId}?generate=${message.id}&model=${encodeURIComponent(model)}`)
    } finally {
      setIsSendingInstruction(false)
    }
  }, [chatId, chatModel, instructions, router, selectedElement])

  if (!workspaceFiles.length) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent p-4 text-center">
        <div className="space-y-2">
          <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No design surface yet</p>
          <p className="text-xs text-muted-foreground">Generate files first.</p>
        </div>
      </div>
    )
  }

  const className = selectedElement?.className ?? ''
  const fontFamily = readClassProperty(className, STYLE_PROPERTY_MATCHERS.fontFamily)?.match(/\[font-family:'?([^\]']+)'?\]/)?.[1] ?? ''
  const fontSizePx = readClassProperty(className, STYLE_PROPERTY_MATCHERS.fontSize)?.match(/\[([\d.]+)px\]/)?.[1] ?? ''
  const fontWeight = readClassProperty(className, STYLE_PROPERTY_MATCHERS.fontWeight) ?? 'font-normal'
  const isItalic = readClassProperty(className, STYLE_PROPERTY_MATCHERS.italic) === 'italic'
  const lineHeight = readClassProperty(className, STYLE_PROPERTY_MATCHERS.lineHeight)?.match(/\[([\d.]+)/)?.[1] ?? ''
  const letterSpacing = readClassProperty(className, STYLE_PROPERTY_MATCHERS.letterSpacing)?.match(/\[(-?[\d.]+)em\]/)?.[1] ?? ''
  const textAlign = readClassProperty(className, STYLE_PROPERTY_MATCHERS.textAlign) ?? 'text-left'
  const textCase = readClassProperty(className, STYLE_PROPERTY_MATCHERS.textCase) ?? 'normal-case'
  const textDecoration = readClassProperty(className, STYLE_PROPERTY_MATCHERS.textDecoration) ?? 'no-underline'
  const textColor = readHex(className, STYLE_PROPERTY_MATCHERS.textColor, '#000000')
  const bgColor = readHex(className, STYLE_PROPERTY_MATCHERS.bgColor, '#ffffff')
  const display = readClassProperty(className, STYLE_PROPERTY_MATCHERS.display) ?? ''
  const marginTop = readPx(className, STYLE_PROPERTY_MATCHERS.marginTop)
  const marginRight = readPx(className, STYLE_PROPERTY_MATCHERS.marginRight)
  const marginBottom = readPx(className, STYLE_PROPERTY_MATCHERS.marginBottom)
  const marginLeft = readPx(className, STYLE_PROPERTY_MATCHERS.marginLeft)
  const paddingTop = readPx(className, STYLE_PROPERTY_MATCHERS.paddingTop)
  const paddingRight = readPx(className, STYLE_PROPERTY_MATCHERS.paddingRight)
  const paddingBottom = readPx(className, STYLE_PROPERTY_MATCHERS.paddingBottom)
  const paddingLeft = readPx(className, STYLE_PROPERTY_MATCHERS.paddingLeft)

  const disabled = !selectedElement

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: breadcrumb + undo/redo/save */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-2">
        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {selectedElement ? (
            <>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">{selectedElement.tag}</span>
              <ChevronRight className="size-3 shrink-0" />
              <span className="truncate">{selectedElement.filePath.split('/').pop()}</span>
            </>
          ) : (
            <span>Click an element in the preview or layers panel</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={undo} disabled={historyIndex <= 0}><Undo2 className="size-3.5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 className="size-3.5" /></Button>
            </TooltipTrigger>
            <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex flex-col gap-4 p-3", disabled && "pointer-events-none opacity-40")}>
          {/* TYPOGRAPHY */}
          <section className="space-y-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Typography</h3>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Font</Label>
              <Select value={fontFamily} onValueChange={(v) => setProperty(STYLE_PROPERTY_MATCHERS.fontFamily, v ? `[font-family:'${v}']` : null)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.label} value={opt.value || '__inherit__'}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Size</Label>
                <Input type="number" className="h-8 text-xs" placeholder="16" value={fontSizePx}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.fontSize, e.target.value ? `text-[${e.target.value}px]` : null)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Weight</Label>
                <Select value={fontWeight} onValueChange={(v) => setProperty(STYLE_PROPERTY_MATCHERS.fontWeight, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={fontWeight === 'font-bold' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0"
                onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.fontWeight, fontWeight === 'font-bold' ? 'font-normal' : 'font-bold')}>
                <Bold className="size-3.5" />
              </Button>
              <Button variant={isItalic ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0"
                onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.italic, isItalic ? 'not-italic' : 'italic')}>
                <Italic className="size-3.5" />
              </Button>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Button variant={textDecoration === 'underline' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0"
                onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textDecoration, textDecoration === 'underline' ? 'no-underline' : 'underline')}>
                <Underline className="size-3.5" />
              </Button>
              <Button variant={textDecoration === 'line-through' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0"
                onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textDecoration, textDecoration === 'line-through' ? 'no-underline' : 'line-through')}>
                <Strikethrough className="size-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Line height</Label>
                <Input type="number" step="0.1" className="h-8 text-xs" placeholder="1.5" value={lineHeight}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.lineHeight, e.target.value ? `leading-[${e.target.value}em]` : null)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Letter spacing</Label>
                <Input type="number" step="0.01" className="h-8 text-xs" placeholder="0" value={letterSpacing}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.letterSpacing, e.target.value ? `tracking-[${e.target.value}em]` : null)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <Button variant={textAlign === 'text-left' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textAlign, 'text-left')}><AlignLeft className="size-3.5" /></Button>
                <Button variant={textAlign === 'text-center' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textAlign, 'text-center')}><AlignCenter className="size-3.5" /></Button>
                <Button variant={textAlign === 'text-right' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textAlign, 'text-right')}><AlignRight className="size-3.5" /></Button>
                <Button variant={textAlign === 'text-justify' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textAlign, 'text-justify')}><AlignJustify className="size-3.5" /></Button>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant={textCase === 'uppercase' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textCase, textCase === 'uppercase' ? 'normal-case' : 'uppercase')}><CaseUpper className="size-3.5" /></Button>
                <Button variant={textCase === 'lowercase' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textCase, textCase === 'lowercase' ? 'normal-case' : 'lowercase')}><CaseLower className="size-3.5" /></Button>
                <Button variant={textCase === 'capitalize' ? 'secondary' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setProperty(STYLE_PROPERTY_MATCHERS.textCase, textCase === 'capitalize' ? 'normal-case' : 'capitalize')}><CaseSensitive className="size-3.5" /></Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* COLOR */}
          <section className="space-y-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Color</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Text</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-start gap-2 px-2 text-xs">
                      <span className="h-4 w-4 rounded border" style={{ backgroundColor: textColor }} />
                      <span className="font-mono">{textColor}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 space-y-2">
                    <input type="color" value={textColor} className="h-8 w-full cursor-pointer rounded border"
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.textColor, `text-[${e.target.value}]`)} />
                    <Input className="h-7 font-mono text-xs" value={textColor}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.textColor, /^#[0-9a-fA-F]{3,8}$/.test(e.target.value) ? `text-[${e.target.value}]` : null)} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Background</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-start gap-2 px-2 text-xs">
                      <span className="h-4 w-4 rounded border" style={{ backgroundColor: bgColor }} />
                      <span className="font-mono">{bgColor}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 space-y-2">
                    <input type="color" value={bgColor} className="h-8 w-full cursor-pointer rounded border"
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.bgColor, `bg-[${e.target.value}]`)} />
                    <Input className="h-7 font-mono text-xs" value={bgColor}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.bgColor, /^#[0-9a-fA-F]{3,8}$/.test(e.target.value) ? `bg-[${e.target.value}]` : null)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          <Separator />

          {/* LAYOUT — box model diagram */}
          <section className="space-y-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Layout</h3>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Display</Label>
              <Select value={display || '__none__'} onValueChange={(v) => setProperty(STYLE_PROPERTY_MATCHERS.display, v === '__none__' ? null : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default</SelectItem>
                  {DISPLAY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Box model diagram: margin (outer) > padding (inner) > content */}
            <div className="rounded-lg border-2 border-dashed border-orange-400/40 bg-orange-400/5 p-2">
              <div className="mb-1 text-center text-[9px] uppercase tracking-wide text-orange-500/70">margin</div>
              <div className="grid grid-cols-3 items-center gap-1">
                <div />
                <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={marginTop}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.marginTop, e.target.value ? `mt-[${e.target.value}px]` : null)} />
                <div />
                <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={marginLeft}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.marginLeft, e.target.value ? `ml-[${e.target.value}px]` : null)} />
                <div className="rounded border-2 border-dashed border-blue-400/40 bg-blue-400/5 p-1.5">
                  <div className="mb-1 text-center text-[9px] uppercase tracking-wide text-blue-500/70">padding</div>
                  <div className="grid grid-cols-3 items-center gap-1">
                    <div />
                    <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={paddingTop}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.paddingTop, e.target.value ? `pt-[${e.target.value}px]` : null)} />
                    <div />
                    <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={paddingLeft}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.paddingLeft, e.target.value ? `pl-[${e.target.value}px]` : null)} />
                    <div className="flex h-8 items-center justify-center rounded bg-background text-[9px] text-muted-foreground">content</div>
                    <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={paddingRight}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.paddingRight, e.target.value ? `pr-[${e.target.value}px]` : null)} />
                    <div />
                    <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={paddingBottom}
                      onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.paddingBottom, e.target.value ? `pb-[${e.target.value}px]` : null)} />
                    <div />
                  </div>
                </div>
                <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={marginRight}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.marginRight, e.target.value ? `mr-[${e.target.value}px]` : null)} />
                <div />
                <Input type="number" placeholder="0" className="h-6 text-center text-[10px]" value={marginBottom}
                  onChange={(e) => setProperty(STYLE_PROPERTY_MATCHERS.marginBottom, e.target.value ? `mb-[${e.target.value}px]` : null)} />
                <div />
              </div>
            </div>
          </section>

          <Separator />

          {/* INSTRUCTIONS — scoped AI follow-up */}
          <section className="space-y-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Instructions</h3>
            <p className="text-[11px] text-muted-foreground">
              {selectedElement ? 'Describe a change for the selected element — sent as a scoped edit, not a full rebuild.' : 'Select an element to scope your instruction, or describe an app-wide tweak.'}
            </p>
            <div className="flex flex-wrap gap-1">
              {DEFAULT_INSTRUCTION_CHIPS.map((chip) => (
                <button key={chip} onClick={() => setInstructions((v) => (v ? `${v} ${chip}` : chip))}
                  className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                  {chip}
                </button>
              ))}
            </div>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. make this bigger and add more breathing room"
              className="min-h-16 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  sendScopedInstruction()
                }
              }}
            />
            <Button size="sm" className="w-full" disabled={!instructions.trim() || isSendingInstruction} onClick={sendScopedInstruction}>
              <Sparkles className="mr-1.5 size-3.5" />
              {isSendingInstruction ? 'Sending…' : 'Send scoped instruction'}
            </Button>
          </section>
        </div>
      </ScrollArea>

      {/* Sticky action bar: Apply / Reset / Preview / Save */}
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-t bg-background/95 p-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={resetChanges} disabled={!dirty}>
                <RotateCcw className="size-3" /> Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>Discard all unsaved edits</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={previewChanges}>
                <Eye className="size-3" /> Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-render the preview with current edits</TooltipContent>
          </Tooltip>
        </div>
        <Button size="sm" className="h-7 gap-1.5 px-3 text-[11px]" onClick={saveDesign} disabled={!dirty || isPending}>
          <Save className="size-3.5" />
          {savedPulse ? 'Saved ✓' : isPending ? 'Applying…' : 'Apply & Save'}
        </Button>
      </div>
    </div>
  )
}
