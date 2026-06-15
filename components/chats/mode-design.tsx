'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ImageIcon, Layers, Palette, Redo2, Save, Sparkles, Type, Undo2 } from 'lucide-react'

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

interface ModeDesignProps {
  chatId: string
  files?: ArtifactFile[]
  saveRequest?: number
  onDirtyChange?: (dirty: boolean) => void
  onPreviewFiles?: (files: ArtifactFile[]) => void
  onSaved?: (message?: SavedDesignMessage, files?: ArtifactFile[]) => void
}

type Snapshot = ArtifactFile[]

const fontOptions = ['Inter, sans-serif', 'system-ui', 'Arial', 'Georgia, serif', 'Fira Code, monospace']
const glassOptions = [
  { label: 'Soft frosted', value: 'bg-white/10 backdrop-blur-md border-white/10' },
  { label: 'Deep glass', value: 'bg-black/20 backdrop-blur-xl border-white/15 shadow-2xl' },
  { label: 'Fractal haze', value: 'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))] backdrop-blur-lg' },
]

export function ModeDesign({ chatId, files = [], saveRequest = 0, onDirtyChange, onPreviewFiles, onSaved }: ModeDesignProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [history, setHistory] = useState<Snapshot[]>([files])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedTokenName, setSelectedTokenName] = useState<string>('')
  const [selectedFilePath, setSelectedFilePath] = useState(files[0]?.path || '')
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)

  useEffect(() => {
    setWorkspaceFiles(files)
    setHistory([files])
    setHistoryIndex(0)
    setSelectedFilePath(files[0]?.path || '')
    setDirty(false)
    onDirtyChange?.(false)
    onPreviewFiles?.(files)
  }, [files, onDirtyChange, onPreviewFiles])

  const tokens = useMemo(() => detectDesignTokens(workspaceFiles), [workspaceFiles])
  const selectedToken = tokens.find((token) => token.name === selectedTokenName) || tokens[0]
  const selectedFile = workspaceFiles.find((file) => file.path === selectedFilePath) || workspaceFiles[0]
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

  const appendUtilityToSelectedFile = (utility: string) => {
    if (!selectedFile || !utility) return
    const nextCode = selectedFile.code.replace(/className="([^"]*)"/, (match, className) => {
      if (className.includes(utility)) return match
      return `className="${className} ${utility}"`
    })
    if (nextCode !== selectedFile.code) updateSelectedFile(nextCode)
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
      const content =
        'Design edits saved from the visual artifact editor.\n\n' +
        workspaceFiles.map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``).join('\n\n')
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
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
      if (key === 's') {
        event.preventDefault()
        saveDesign()
      }
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
          {dirty && <span className="hidden text-[11px] text-amber-500 sm:inline">Unsaved</span>}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo design change">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo design change">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
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
                <Button key={option.label} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtilityToSelectedFile(option.value)}>
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
            {fontOptions.map((font) => (
              <Button key={font} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtilityToSelectedFile(`font-[${font.replace(/\s+/g, '_')}]`)}>
                {font}
              </Button>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {['text-xs', 'text-sm', 'text-base', 'text-lg', 'font-medium', 'font-semibold', 'leading-tight', 'leading-relaxed'].map((utility) => (
                <Button key={utility} variant="outline" size="sm" className="text-xs" onClick={() => appendUtilityToSelectedFile(utility)}>
                  {utility}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="asset" className="m-0 space-y-3 p-3">
            <p className="text-xs leading-5 text-muted-foreground">Asset controls patch the selected file and update the live preview immediately. Save commits them as a new version.</p>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtilityToSelectedFile('overflow-hidden')}>Prevent overflow</Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => appendUtilityToSelectedFile('object-cover')}>Image object-cover</Button>
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
