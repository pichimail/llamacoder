'use client'

import { useState } from 'react'
import { FileExplorer, type FileNode } from './file-explorer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Download } from 'lucide-react'

interface ModeCodeProps {
  chatId: string
  files?: FileNode[]
  onFileSelect?: (path: string) => void
  selectedPath?: string
}

// Mock data for demo
const defaultFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        id: '1.1',
        name: 'app.tsx',
        type: 'file',
        path: '/src/app.tsx',
      },
      {
        id: '1.2',
        name: 'components',
        type: 'folder',
        path: '/src/components',
        children: [
          {
            id: '1.2.1',
            name: 'Button.tsx',
            type: 'file',
            path: '/src/components/Button.tsx',
          },
          {
            id: '1.2.2',
            name: 'Card.tsx',
            type: 'file',
            path: '/src/components/Card.tsx',
          },
        ],
      },
      {
        id: '1.3',
        name: 'styles',
        type: 'folder',
        path: '/src/styles',
        children: [
          {
            id: '1.3.1',
            name: 'globals.css',
            type: 'file',
            path: '/src/styles/globals.css',
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'package.json',
    type: 'file',
    path: '/package.json',
  },
  {
    id: '3',
    name: 'README.md',
    type: 'file',
    path: '/README.md',
  },
]

const sampleCode = `'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Hello World</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Count: {count}
        </p>
        <Button onClick={() => setCount(count + 1)} size="lg">
          Increment
        </Button>
      </div>
    </div>
  )
}`

export function ModeCode({
  chatId,
  files = defaultFiles,
  onFileSelect,
  selectedPath = '/src/app.tsx',
}: ModeCodeProps) {
  const [selectedFile, setSelectedFile] = useState(selectedPath)
  const [code, setCode] = useState(sampleCode)

  const handleSelectFile = (path: string) => {
    setSelectedFile(path)
    onFileSelect?.(path)
  }

  return (
    <div className="w-full h-full flex bg-background overflow-hidden">
      {/* File Explorer */}
      <FileExplorer
        files={files}
        onSelectFile={handleSelectFile}
        selectedPath={selectedFile}
      />

      {/* Code Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File Header */}
        <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between">
          <span className="text-sm font-mono text-muted-foreground">{selectedFile}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(code)}
              className="h-7"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 font-mono text-sm bg-card">
              <div className="text-muted-foreground select-none">
                {code.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-12 text-right pr-4 text-xs opacity-50">
                      {i + 1}
                    </span>
                    <span className="flex-1">{line || '\n'}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Status Bar */}
        <div className="h-7 border-t border-border bg-muted px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{code.split('\n').length} lines</span>
          <span>UTF-8 • JavaScript • CRLF</span>
        </div>
      </div>
    </div>
  )
}
