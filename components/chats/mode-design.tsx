'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ImageIcon, Layers, MousePointer2, Palette, Redo2, Save, Sparkles, Trash2, Type, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { ArtifactFile, DesignToken } from '@/lib/artifact-analysis'
import { applyTokenChange, detectDesignTokens, patchFileContent } from '@/lib/artifact-analysis'
import { createMessage } from '@/app/(main)/actions'

type SavedDesignMessage = Awaited<ReturnType<typeof createMessage>>
type Snapshot = ArtifactFile[]
type ElementTarget = { id: string; filePath: string; tag: string; className: string; text: string; match: string }

interface ModeDesignProps {
  chatId: string
  files?: ArtifactFile[]
  saveRequest?: number
  onDirtyChange?: (dirty: boolean) => void
  onPreviewFiles?: (files: ArtifactFile[]) => void
  onSaved?: (message?: SavedDesignMessage, files?: ArtifactFile[]) => void
  inspectorActive?: boolean
  onInspectorActiveChange?: (active: boolean) => void
}

const fontOptions = ['Inter, sans-serif', 'system-ui', 'Arial', 'Georgia, serif', 'Fira Code, monospace']
const glassOptions = [
  { label: 'Soft frosted', value: 'bg-white/10 backdrop-blur-md border-white/10' },
  { label: 'Deep glass', value: 'bg-black/20 backdrop-blur-xl border-white/15 shadow-2xl' },
  { label: 'Fractal haze', value: 'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))] backdrop-blur-lg' },
]

function detectElementTargets(files: ArtifactFile[]): ElementTarget[] {
  const targets: ElementTarget[] = []
  for (const file of files.filter((item) => /\.(tsx|jsx)$/i.test(item.path))) {
    const matches = file.code.match(/<([A-Za-z][A-Za-z0-9.]*)\b[^>]*?(?:\/>|>[^<]{0,120}<\/[A-Za-z][A-Za-z0-9.]*>)/g) || []
    matches.slice(0, 80).forEach((chunk, index) => {
      const tag = chunk.match(/^<([A-Za-z][A-Za-z0-9.]*)/)?.[1] || 'Element'
      const className = chunk.match(/className="([^"]*)"/)?.[1] || ''
      const text = chunk.match(/>([^<]{1,120})<\//)?.[1]?.trim() || ''
      targets.push({ id: `${file.path}:${index}:${tag}`, filePath: file.path, tag, className, text, match: chunk })
    })
  }
  return targets.slice(0, 120)
}

function patchElement(files: ArtifactFile[], target: ElementTarget, nextMatch: string) {
  return files.map((file) => (file.path === target.filePath ? { ...file, code: file.code.replace(target.match, nextMatch) } : file))
}

export function ModeDesign({ chatId, files = [], saveRequest = 0, onDirtyChange, onPreviewFiles, onSaved, inspectorActive = true, onInspectorActiveChange }: ModeDesignProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [history, setHistory] = useState<Snapshot[]>([files])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedTokenName, setSelectedTokenName] = useState('')
  const [selectedFilePath, setSelectedFilePath] = useState(files[0]?.path || '')
  const [selectedElementId, setSelectedElementId] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)

  useEffect(() => {
    setWorkspaceFiles(files)
    setHistory([files])
    setHistoryIndex(0)
    setSelectedFilePath(files[0]?.path || '')
    setSelectedElementId('')
    setDirty(false)
    onDirtyChange?.(false)
    onPreviewFiles?.(files)
  }, [files, onDirtyChange, onPreviewFiles])

  const tokens = useMemo(() => detectDesignTokens(workspaceFiles), [workspaceFiles])
  const elements = useMemo(() => detectElementTargets(workspaceFiles), [workspaceFiles])
  const selectedToken = tokens.find((token) => token.name === selectedTokenName) || tokens[0]
  const selectedFile = workspaceFiles.find((file) => file.path === selectedFilePath) || workspaceFiles[0]
  const selectedElement = elements.find((element) => element.id === selectedElementId) || elements[0]
  const colorTokens = tokens.filter((token) => token.category === 'color')
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

  const appendUtility = (utility: string) => {
    if (selectedElement) {
      updateSelectedElementClass(`${selectedElement.className} ${utility}`.trim())
      return
    }
    if (!selectedFile) return
    const nextCode = selectedFile.code.replace(/className="([^"]*)"/, (match, className) => className.includes(utility) ? match : `className="${className} ${utility}"`)
    if (nextCode !== selectedFile.code) updateSelectedFile(nextCode)
  }

  const updateSelectedElementClass = (nextClassName: string) => {
    if (!selectedElement) return
    const nextMatch = selectedElement.match.includes('className=')
      ? selectedElement.match.replace(/className="([^"]*)"/, `className="${nextClassName}"`)
      : selectedElement.match.replace(/^<([A-Za-z][A-Za-z0-9.]*)/, `<$1 className="${nextClassName}"`)
    markDirty(patchElement(workspaceFiles, selectedElement, nextMatch))
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
      const content = 'Design edits saved from the visual artifact editor.\n\n' + workspaceFiles.map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``).join('\n\n')
      const message = await createMessage(chatId, content, 'assistant', workspaceFiles)
      setDirty(false)
      onDirtyChange?.(false)
      onPreviewFiles?.(workspaceFiles)
      onSaved?.(message, workspaceFiles)
      setSavedPulse(true)
      window.setTimeout(() => setSavedPulse(false), 1200)
      router.refresh()
    })
  }, [chatId, onDirtyChange, onPreviewFiles, onSaved, router, workspaceFiles])

  useEffect(() => {
    if (saveRequest > 0) saveDesign()
  }, [saveRequest, saveDesign])

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
      <div className="flex h-full items-center justify-center bg-card p-4 text-center">
        <div className="space-y-2">
          <Palette className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No design surface yet</p>
          <p className="text-xs text-muted-foreground">Generate files first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card text-foreground">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</span>
        <div className="flex items-center gap-1">
          <Button variant={inspectorActive ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => onInspectorActiveChange?.(!inspectorActive)} aria-label="Toggle visual inspector">
            <MousePointer2 className="h-3.5 w-3.5" />
          </Button>
          {dirty && <span className="hidden text-[11px] text-amber-500 sm:inline">Unsaved</span>}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo design change"><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo design change"><Redo2 className="h-3.5 w-3.5" /></Button>
          <Button size="sm" className="h-7 px-2 text-xs" onClick={saveDesign} disabled={!dirty || isPending} aria-label="Save design changes">
            {savedPulse ? <Check className="mr-1 h-3.5 w-3.5" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="style" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-10 shrink-0 grid-cols-4 rounded-none border-b bg-background">
          <TabsTrigger value="style" className="text-xs"><Palette className="mr-1 h-3 w-3" />Style</TabsTrigger>
          <TabsTrigger value="type" className="text-xs"><Type className="mr-1 h-3 w-3" />Type</TabsTrigger>
          <TabsTrigger value="asset" className="text-xs"><ImageIcon className="mr-1 h-3 w-3" />Asset</TabsTrigger>
          <TabsTrigger value="code" className="text-xs"><Layers className="mr-1 h-3 w-3" />Code</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="style" className="m-0 space-y-4 p-3">
            <div className="space-y-2">
              <Label className="text-xs">Detected layers</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {elements.length ? elements.slice(0, 48).map((element) => (
                  <button key={element.id} onClick={() => { setSelectedElementId(element.id); setSelectedFilePath(element.filePath) }} className={`block w-full rounded px-2 py-1.5 text-left transition hover:bg-background ${selectedElement?.id === element.id ? 'bg-background ring-1 ring-ring' : ''}`}>
                    <p className="truncate font-mono text-[11px] text-foreground">{element.tag}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{element.text || element.className || element.filePath}</p>
                  </button>
                )) : <p className="px-2 py-3 text-center text-xs text-muted-foreground">No selectable JSX layers detected.</p>}
              </div>
            </div>

            {selectedElement && (
              <div className="space-y-2 rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Selected element</Label>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={removeSelectedElement} aria-label="Remove selected element"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <Input value={selectedElement.tag} readOnly className="h-8 font-mono text-xs" />
                <Label className="text-xs">Class utilities</Label>
                <Textarea value={selectedElement.className} onChange={(event) => updateSelectedElementClass(event.target.value)} className="min-h-20 bg-background font-mono text-xs" aria-label="Edit selected element class utilities" />
                {selectedElement.text && (
                  <>
                    <Label className="text-xs">Text</Label>
                    <Input value={selectedElement.text} onChange={(event) => updateSelectedElementText(event.target.value)} className="h-8 text-xs" aria-label="Edit selected element text" />
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Colors</Label>
              <div className="grid grid-cols-2 gap-2">
                {colorTokens.slice(0, 12).map((token) => (
                  <button key={`${token.name}-${token.value}`} onClick={() => setSelectedTokenName(token.name)} className={`rounded-md border border-border p-2 text-left transition hover:bg-background ${selectedToken?.name === token.name ? 'ring-1 ring-ring' : ''}`}>
                    <div className="mb-2 h-8 rounded border border-border" style={{ background: token.value }} />
                    <p className="truncate font-mono text-[11px] text-foreground">{token.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{token.value}</p>
                  </button>
                ))}
              </div>
            </div>
            {selectedToken && (
              <div className="space-y-2 border-t border-border pt-3">
                <Label className="text-xs">Selected token</Label>
                <Input value={selectedToken.name} readOnly className="h-8 font-mono text-xs" />
                <Label className="text-xs">Value</Label>
                <Input value={selectedToken.value} onChange={(event) => updateToken(selectedToken, event.target.value)} className="h-8 font-mono text-xs" aria-label="Edit design token value" />
              </div>
            )}
            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs">Glass utilities</Label>
              {glassOptions.map((option) => (
                <Button key={option.label} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtility(option.value)}>
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> {option.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="type" className="m-0 space-y-3 p-3">
            <div className="space-y-2">
              <Label className="text-xs">Detected type tokens</Label>
              {typographyTokens.slice(0, 8).map((token) => (
                <button key={token.name} className="block w-full rounded border border-border p-2 text-left hover:bg-background" onClick={() => setSelectedTokenName(token.name)}>
                  <p className="font-mono text-[11px] text-muted-foreground">{token.name}</p>
                  <p className="truncate text-sm" style={{ fontFamily: token.value }}>{token.value}</p>
                </button>
              ))}
            </div>
            <Label className="text-xs">Font family utility</Label>
            {fontOptions.map((font) => <Button key={font} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtility(`font-[${font.replace(/\s+/g, '_')}]`)}>{font}</Button>)}
            <div className="grid grid-cols-2 gap-2">
              {['text-xs', 'text-sm', 'text-base', 'text-lg', 'font-medium', 'font-semibold', 'leading-tight', 'leading-relaxed'].map((utility) => (
                <Button key={utility} variant="outline" size="sm" className="text-xs" onClick={() => appendUtility(utility)}>{utility}</Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="asset" className="m-0 space-y-3 p-3">
            <p className="text-xs leading-5 text-muted-foreground">Asset controls patch the selected element or file and update the live preview immediately. Save commits them as a new version.</p>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtility('overflow-hidden')}>Prevent overflow</Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtility('object-cover')}>Image object-cover</Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtility('hidden')}>Hide selected</Button>
          </TabsContent>

          <TabsContent value="code" className="m-0 space-y-3 p-3">
            <Label className="text-xs">File</Label>
            <select value={selectedFile?.path || ''} onChange={(event) => setSelectedFilePath(event.target.value)} className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground" aria-label="Select file to edit">
              {workspaceFiles.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
            </select>
            <Textarea value={selectedFile?.code || ''} onChange={(event) => updateSelectedFile(event.target.value)} className="min-h-72 resize-y bg-background font-mono text-xs text-foreground" spellCheck={false} aria-label="Live edit selected artifact file" />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-3 text-[11px] text-muted-foreground">
        <span>{workspaceFiles.length} files</span>
        <span>{[...spacingTokens, ...radiusTokens].length} layout tokens</span>
      </div>
    </div>
  )
}
