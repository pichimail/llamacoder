'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { ChevronRight, ChevronDown, File, Folder, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider, Tip } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FileNode {
  path: string
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  language?: string
}

const mockFiles: FileNode[] = [
  {
    path: '/app',
    name: 'app',
    type: 'folder',
    children: [
      { path: '/app/layout.tsx', name: 'layout.tsx', type: 'file', language: 'typescript' },
      { path: '/app/page.tsx', name: 'page.tsx', type: 'file', language: 'typescript' },
      { path: '/app/globals.css', name: 'globals.css', type: 'file', language: 'css' },
    ],
  },
  {
    path: '/components',
    name: 'components',
    type: 'folder',
    children: [
      { path: '/components/button.tsx', name: 'button.tsx', type: 'file', language: 'typescript' },
      { path: '/components/card.tsx', name: 'card.tsx', type: 'file', language: 'typescript' },
    ],
  },
  { path: '/package.json', name: 'package.json', type: 'file', language: 'json' },
  { path: '/tsconfig.json', name: 'tsconfig.json', type: 'file', language: 'json' },
]

interface CodeModeProps {
  chatId: string
  projectId?: string
}

interface FileNodeProps {
  node: FileNode
  depth?: number
}

function FileTreeNode({ node, depth = 0 }: FileNodeProps) {
  const { expandedFolders, toggleFolder, selectedFile, setSelectedFile } = useUIStore()
  const isExpanded = expandedFolders.has(node.path)

  if (node.type === 'file') {
    return (
      <button
        onClick={() => setSelectedFile(node.path)}
        className={`w-full flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent rounded transition-colors ${
          selectedFile === node.path ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <File className="w-4 h-4 opacity-50" />
        <span>{node.name}</span>
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => toggleFolder(node.path)}
        className="w-full flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent rounded transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Folder className="w-4 h-4 opacity-70" />
        <span>{node.name}</span>
      </button>

      {isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CodeMode({ chatId, projectId }: CodeModeProps) {
  const { selectedFile } = useUIStore()
  const [fileContent, setFileContent] = useState('')

  useEffect(() => {
    if (selectedFile) {
      // Mock file content - in real app would fetch from backend
      setFileContent(`// Content of ${selectedFile}\n\nexport default function() {\n  return <div>Hello</div>\n}`)
    }
  }, [selectedFile])

  return (
    <div className="w-full h-full flex bg-background">
      {/* File Tree */}
      <div className="w-64 border-r border-border flex flex-col bg-muted">
        <div className="h-10 border-b border-border px-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Files
          </span>
          <TooltipProvider>
            <Tip label="New file">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </Tip>
          </TooltipProvider>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {mockFiles.map((file) => (
              <FileTreeNode key={file.path} node={file} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile && (
          <>
            <div className="h-10 border-b border-border px-4 flex items-center justify-between bg-muted">
              <span className="text-sm font-medium">{selectedFile}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-sm bg-background">
              <pre className="text-foreground/80 whitespace-pre-wrap break-words">
                {fileContent}
              </pre>
            </div>
          </>
        )}

        {!selectedFile && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <File className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Select a file to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
