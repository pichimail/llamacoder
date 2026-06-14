'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileExplorer, type FileNode } from './file-explorer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Check, Copy, Download, Save } from 'lucide-react'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import { patchFileContent } from '@/lib/artifact-analysis'
import { createMessage } from '@/app/(main)/actions'

interface ModeCodeProps {
  chatId: string
  files?: ArtifactFile[]
}

function toTree(files: ArtifactFile[]): FileNode[] {
  const root: FileNode[] = []
  const folderMap = new Map<string, FileNode>()

  files.forEach((file) => {
    const parts = file.path.replace(/^\/+/, '').split('/')
    let current = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isFile = index === parts.length - 1

      if (isFile) {
        current.push({ id: file.path, name: part, type: 'file', path: file.path })
        return
      }

      let folder = folderMap.get(currentPath)
      if (!folder) {
        folder = { id: currentPath, name: part, type: 'folder', path: currentPath, children: [] }
        folderMap.set(currentPath, folder)
        current.push(folder)
      }
      current = folder.children || []
    })
  })

  return root
}

export function ModeCode({ chatId, files = [] }: ModeCodeProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [workspaceFiles, setWorkspaceFiles] = useState(files)
  const [selectedFile, setSelectedFile] = useState(files[0]?.path || '')
  const [copied, setCopied] = useState(false)
  const [dirty, setDirty] = useState(false)

  const tree = useMemo(() => toTree(workspaceFiles), [workspaceFiles])
  const activeFile = workspaceFiles.find((file) => file.path === selectedFile) || workspaceFiles[0]

  const updateActiveFile = (nextCode: string) => {
    if (!activeFile) return
    setWorkspaceFiles((current) => patchFileContent(current, activeFile.path, nextCode))
    setDirty(true)
  }

  const saveFiles = () => {
    if (!workspaceFiles.length) return
    startTransition(async () => {
      const content =
        'Code edit saved from the artifact workspace.\n\n' +
        workspaceFiles
          .map((file) => `\`\`\`${file.language || 'tsx'}{path=${file.path}}\n${file.code}\n\`\`\``)
          .join('\n\n')
      await createMessage(chatId, content, 'assistant', workspaceFiles)
      setDirty(false)
      router.refresh()
    })
  }

  const downloadArtifact = () => {
    const blob = new Blob([JSON.stringify(workspaceFiles, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'artifact-files.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!workspaceFiles.length) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">No artifact files yet</p>
          <p className="text-sm text-muted-foreground">Generate an app from the home prompt first, then Code mode will bind to those files.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <FileExplorer files={tree} onSelectFile={(path) => setSelectedFile(path)} selectedPath={activeFile?.path} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
          <span className="truncate font-mono text-xs text-muted-foreground">{activeFile?.path}</span>
          <div className="flex items-center gap-1">
            {dirty && <span className="hidden text-[11px] text-muted-foreground sm:inline">Unsaved</span>}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async () => {
                if (!activeFile) return
                await navigator.clipboard.writeText(activeFile.code)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1200)
              }}
              aria-label="Copy file code"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={downloadArtifact} aria-label="Download artifact files">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8" onClick={saveFiles} disabled={!dirty || isPending} aria-label="Save code changes">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <Textarea
            value={activeFile?.code || ''}
            onChange={(event) => updateActiveFile(event.target.value)}
            className="min-h-[calc(100dvh-7rem)] resize-none rounded-none border-0 bg-background p-4 font-mono text-sm shadow-none focus-visible:ring-0"
            spellCheck={false}
            aria-label={`Editing ${activeFile?.path}`}
          />
        </ScrollArea>

        <div className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-card px-3 text-[11px] text-muted-foreground">
          <span>{workspaceFiles.length} files</span>
          <span>{activeFile?.code.split('\n').length || 0} lines</span>
        </div>
      </div>
    </div>
  )
}
