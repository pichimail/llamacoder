'use client'

import { useState, ReactNode } from 'react'
import { ChevronRight, ChevronDown, File, Folder, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface FileExplorerProps {
  files: FileNode[]
  onSelectFile?: (path: string, content: string) => void
  onCreateFile?: (path: string) => void
  onDeleteFile?: (path: string) => void
  selectedPath?: string
}

function FileTreeNode({
  node,
  level = 0,
  onSelect,
  selectedPath,
  onDelete,
}: {
  node: FileNode
  level?: number
  onSelect?: (path: string) => void
  selectedPath?: string
  onDelete?: (path: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isFolder = node.type === 'folder'
  const isSelected = selectedPath === node.path
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded group transition-colors ${
          isSelected ? 'bg-accent text-accent-foreground' : ''
        }`}
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen)
          } else {
            onSelect?.(node.path)
          }
        }}
      >
        {isFolder ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(!isOpen)
              }}
              className="p-0"
            >
              {hasChildren ? (
                isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <div className="w-4" />
              )}
            </button>
            <Folder className="w-4 h-4 text-blue-400" />
          </>
        ) : (
          <>
            <div className="w-4" />
            <File className="w-4 h-4 text-gray-400" />
          </>
        )}
        <span className="flex-1 font-mono text-xs">{node.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(node.path)
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
        </button>
      </div>

      {isOpen && hasChildren && (
        <div className="ml-2">
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileExplorer({
  files,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  selectedPath,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-64 border-r border-border bg-muted flex flex-col h-full">
      {/* Header */}
      <div className="h-10 border-b border-border px-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Files</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCreateFile?.('new-file.tsx')}
          className="h-6 px-2"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto p-2">
        {filteredFiles.length > 0 ? (
          <div className="space-y-1">
            {filteredFiles.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                onSelect={onSelectFile}
                selectedPath={selectedPath}
                onDelete={onDeleteFile}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-8">
            {searchQuery ? 'No files found' : 'No files'}
          </div>
        )}
      </div>
    </div>
  )
}
