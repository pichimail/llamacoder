'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Eye,
  ImageIcon,
  Layers,
  Palette,
  Redo2,
  Save,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { ArtifactFile, DesignToken } from '@/lib/artifact-analysis'
import { applyTokenChange, detectDesignTokens, patchFileContent } from '@/lib/artifact-analysis'
import { createMessage } from '@/app/(main)/actions'

interface ModeDesignProps {
  chatId: string
  files?: ArtifactFile[]
  saveRequest?: number
  onDirtyChange?: (dirty: boolean) => void
  onSaved?: () => void
}

type Snapshot = ArtifactFile[]
type SheetSnap = '30' | '50' | '70' | '100'

const sheetHeights: Record<SheetSnap, string> = {
  '30': '30dvh',
  '50': '50dvh',
  '70': '70dvh',
  '100': '100dvh',
}

const fontOptions = ['Inter, sans-serif', 'system-ui', 'Arial', 'Georgia, serif', 'Fira Code, monospace']
const glassOptions = [
  { label: 'None', value: '' },
  { label: 'Soft frosted', value: 'bg-white/10 backdrop-blur-md border-white/10' },
  { label: 'Deep glass', value: 'bg-black/20 backdrop-blur-xl border-white/15 shadow-2xl' },
  { label: 'Fractal haze', value: 'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))] backdrop-blur-lg' },
]

export function ModeDesign({
  chatId,
  files = [],
  saveRequest = 0,
  onDirtyChange,
  onSaved,
}: ModeDesignProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [history, setHistory] = useState<Snapshot[]>([files])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedTokenName, setSelectedTokenName] = useState<string>('')
  const [selectedFilePath, setSelectedFilePath] = useState(files[0]?.path || '')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('70')

  const tokens = useMemo(() => detectDesignTokens(workspaceFiles), [workspaceFiles])
  const selectedToken = tokens.find((token) => token.name === selectedTokenName) || tokens[0]
  const selectedFile = workspaceFiles.find((file) => file.path === selectedFilePath) || workspaceFiles[0]
  const colorTokens = tokens.filter((token) => token.category === 'color')
  const typographyTokens = tokens.filter((token) => token.category === 'typography')
  const spacingTokens = tokens.filter((token) => token.category === 'spacing')
  const radiusTokens = tokens.filter((token) => token.category === 'radius')

  const commitFiles = useCallback(
    (nextFiles: ArtifactFile[]) => {
      const nextHistory = history.slice(0, historyIndex + 1)
      nextHistory.push(nextFiles)
      setHistory(nextHistory)
      setHistoryIndex(nextHistory.length - 1)
      setWorkspaceFiles(nextFiles)
      setDirty(true)
      onDirtyChange?.(true)
    },
    [history, historyIndex, onDirtyChange],
  )

  const updateToken = (token: DesignToken, nextValue: string) => {
    const result = applyTokenChange(workspaceFiles, token, nextValue)
    if (result.changed) commitFiles(result.files)
  }

  const updateSelectedFile = (nextCode: string) => {
    if (!selectedFile) return
    commitFiles(patchFileContent(workspaceFiles, selectedFile.path, nextCode))
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
    setHistoryIndex(nextIndex)
    setWorkspaceFiles(history[nextIndex])
    setDirty(true)
    onDirtyChange?.(true)
  }, [history, historyIndex, onDirtyChange])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setWorkspaceFiles(history[nextIndex])
    setDirty(true)
    onDirtyChange?.(true)
  }, [history, historyIndex, onDirtyChange])

  const saveDesign = useCallback(() => {
    if (!workspaceFiles.length) return
    startTransition(async () => {
      const content =
        'Design edits saved from the visual artifact editor.\n\n' +
        workspaceFiles
          .map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``)
          .join('\n\n')
      await createMessage(chatId, content, 'assistant', workspaceFiles)
      setDirty(false)
      onDirtyChange?.(false)
      onSaved?.()
      setSavedPulse(true)
      window.setTimeout(() => setSavedPulse(false), 1200)
      router.refresh()
    })
  }, [chatId, onDirtyChange, onSaved, router, workspaceFiles])

  useEffect(() => {
    if (saveRequest > 0) saveDesign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRequest])

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
      <div className="flex h-full items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <Palette className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No artifact available for design editing</p>
          <p className="text-sm text-muted-foreground">Generate an app first. Design mode will then inspect that app’s real files and tokens.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Design live preview">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm font-medium">Live design workspace</span>
            {dirty && <span className="text-[11px] text-muted-foreground">Unsaved</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo design change">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo design change">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant={inspectorOpen ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setInspectorOpen((value) => !value)} aria-label="Toggle design inspector" aria-pressed={inspectorOpen}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8" onClick={saveDesign} disabled={!dirty || isPending} aria-label="Save design changes">
              {savedPulse ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {colorTokens.slice(0, 8).map((token) => (
                <button
                  key={`${token.name}-${token.value}`}
                  onClick={() => setSelectedTokenName(token.name)}
                  className={`rounded-md border border-border p-3 text-left transition hover:bg-card ${selectedToken?.name === token.name ? 'bg-card ring-1 ring-ring' : ''}`}
                >
                  <div className="mb-3 h-16 rounded border border-border" style={{ background: token.value }} />
                  <p className="truncate font-mono text-xs font-medium">{token.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{token.value}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3 rounded-md border border-border p-4">
                <h3 className="text-sm font-semibold">Typography</h3>
                {typographyTokens.slice(0, 4).map((token) => (
                  <button key={token.name} className="block w-full rounded border border-border p-3 text-left hover:bg-card" onClick={() => setSelectedTokenName(token.name)}>
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                    <p className="truncate text-lg" style={{ fontFamily: token.value }}>The quick brown fox jumps over the lazy dog</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3 rounded-md border border-border p-4">
                <h3 className="text-sm font-semibold">Spacing & Radius</h3>
                {[...spacingTokens.slice(0, 5), ...radiusTokens.slice(0, 5)].map((token) => (
                  <button key={`${token.name}-${token.value}`} className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-card" onClick={() => setSelectedTokenName(token.name)}>
                    <span className="w-24 truncate font-mono text-xs text-muted-foreground">{token.name}</span>
                    <span className="truncate text-xs">{token.value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border">
              <div className="flex h-9 items-center justify-between border-b border-border px-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Selected file preview</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{selectedFile?.path}</span>
              </div>
              <pre className="max-h-80 overflow-auto p-4 text-xs text-muted-foreground"><code>{selectedFile?.code}</code></pre>
            </div>
          </div>
        </ScrollArea>
      </section>

      {inspectorOpen && (
        <aside className="hidden w-80 shrink-0 overflow-hidden border-l border-border bg-card lg:block" aria-label="Design inspector">
          <Inspector
            files={workspaceFiles}
            selectedFile={selectedFile}
            selectedToken={selectedToken}
            onSelectFile={setSelectedFilePath}
            onUpdateFile={updateSelectedFile}
            onUpdateToken={updateToken}
            onApplyUtility={appendUtilityToSelectedFile}
          />
        </aside>
      )}

      {inspectorOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 rounded-t-xl border border-border bg-card shadow-2xl lg:hidden"
          style={{ height: sheetHeights[sheetSnap] }}
          role="dialog"
          aria-label="Mobile design inspector"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="mx-auto h-1 w-10 rounded-full bg-border" />
            <div className="absolute right-3 flex gap-1">
              {(['30', '50', '70', '100'] as SheetSnap[]).map((snap) => (
                <button key={snap} onClick={() => setSheetSnap(snap)} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background" aria-label={`Snap inspector to ${snap}%`}>
                  {snap}
                </button>
              ))}
            </div>
          </div>
          <Inspector
            files={workspaceFiles}
            selectedFile={selectedFile}
            selectedToken={selectedToken}
            onSelectFile={setSelectedFilePath}
            onUpdateFile={updateSelectedFile}
            onUpdateToken={updateToken}
            onApplyUtility={appendUtilityToSelectedFile}
          />
        </div>
      )}
    </div>
  )
}

function Inspector({
  files,
  selectedFile,
  selectedToken,
  onSelectFile,
  onUpdateFile,
  onUpdateToken,
  onApplyUtility,
}: {
  files: ArtifactFile[]
  selectedFile?: ArtifactFile
  selectedToken?: DesignToken
  onSelectFile: (path: string) => void
  onUpdateFile: (code: string) => void
  onUpdateToken: (token: DesignToken, value: string) => void
  onApplyUtility: (utility: string) => void
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Inspector</span>
      </div>
      <Tabs defaultValue="styles" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-10 shrink-0 grid-cols-4 rounded-none border-b bg-background">
          <TabsTrigger value="styles" className="text-xs"><Palette className="mr-1 h-3 w-3" />Style</TabsTrigger>
          <TabsTrigger value="type" className="text-xs"><Type className="mr-1 h-3 w-3" />Type</TabsTrigger>
          <TabsTrigger value="asset" className="text-xs"><ImageIcon className="mr-1 h-3 w-3" />Asset</TabsTrigger>
          <TabsTrigger value="code" className="text-xs"><Layers className="mr-1 h-3 w-3" />Code</TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="styles" className="m-0 space-y-4 p-3">
            {selectedToken ? (
              <div className="space-y-2">
                <Label className="text-xs">Selected token</Label>
                <Input value={selectedToken.name} readOnly className="h-8 font-mono text-xs" />
                <Label className="text-xs">Value</Label>
                <Input
                  value={selectedToken.value}
                  onChange={(event) => onUpdateToken(selectedToken, event.target.value)}
                  className="h-8 font-mono text-xs"
                  aria-label="Edit design token value"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No token selected.</p>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Glass / background utility</Label>
              {glassOptions.map((option) => (
                <Button key={option.label} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => onApplyUtility(option.value)} disabled={!option.value}>
                  {option.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="type" className="m-0 space-y-3 p-3">
            <Label className="text-xs">Font family utility</Label>
            {fontOptions.map((font) => (
              <Button key={font} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => onApplyUtility(`font-[${font.replace(/\s+/g, '_')}]`)}>
                {font}
              </Button>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {['text-xs', 'text-sm', 'text-base', 'text-lg', 'font-medium', 'font-semibold'].map((utility) => (
                <Button key={utility} variant="outline" size="sm" className="text-xs" onClick={() => onApplyUtility(utility)}>
                  {utility}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="asset" className="m-0 space-y-3 p-3">
            <p className="text-xs text-muted-foreground">Asset controls patch the selected file. Replace image URLs, icon names, or remove a selected component block directly in Code tab.</p>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => onApplyUtility('overflow-hidden')}>Prevent overflow</Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => onApplyUtility('object-cover')}>Image object-cover</Button>
            <Button variant="destructive" size="sm" className="w-full justify-start text-xs" onClick={() => selectedFile && onUpdateFile(selectedFile.code.replace(/<[^>]+>[^<]*<\/[^>]+>/, ''))}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete first simple element
            </Button>
          </TabsContent>

          <TabsContent value="code" className="m-0 space-y-3 p-3">
            <Label className="text-xs">File</Label>
            <select
              value={selectedFile?.path || ''}
              onChange={(event) => onSelectFile(event.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
              aria-label="Select file to edit"
            >
              {files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
            </select>
            <Textarea
              value={selectedFile?.code || ''}
              onChange={(event) => onUpdateFile(event.target.value)}
              className="min-h-72 resize-y font-mono text-xs"
              spellCheck={false}
              aria-label="Live edit selected artifact file"
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
