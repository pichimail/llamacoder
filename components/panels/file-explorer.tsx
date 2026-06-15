'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Plus } from 'lucide-react';
import clsx from 'clsx';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileExplorerProps {
  files?: FileNode[];
}

const DEFAULT_FILES: FileNode[] = [
  {
    id: '1',
    name: 'app',
    type: 'folder',
    children: [
      { id: '1.1', name: 'page.tsx', type: 'file' },
      { id: '1.2', name: 'layout.tsx', type: 'file' },
    ],
    isOpen: true,
  },
  {
    id: '2',
    name: 'components',
    type: 'folder',
    children: [
      { id: '2.1', name: 'Header.tsx', type: 'file' },
      { id: '2.2', name: 'Footer.tsx', type: 'file' },
    ],
  },
  {
    id: '3',
    name: 'lib',
    type: 'folder',
  },
  {
    id: '4',
    name: 'package.json',
    type: 'file',
  },
];

export function FileExplorer({ files = DEFAULT_FILES }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState(files);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const toggleFolder = (id: string) => {
    const toggle = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggle(node.children) };
        }
        return node;
      });
    };
    setFileTree(toggle(fileTree));
  };

  const FileTreeNode = ({ node, level = 0 }: { node: FileNode; level?: number }) => (
    <div key={node.id}>
      {node.type === 'folder' ? (
        <>
          <button
            onClick={() => toggleFolder(node.id)}
            className={clsx(
              'w-full flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-muted/50 rounded transition-colors',
              level > 0 && 'ml-2'
            )}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {node.isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Folder className="h-4 w-4 text-amber-500" />
            <span className="text-foreground flex-1 text-left">{node.name}</span>
          </button>
          {node.isOpen &&
            node.children?.map((child) => (
              <FileTreeNode key={child.id} node={child} level={level + 1} />
            ))}
        </>
      ) : (
        <button
          onClick={() => setSelectedFile(node.id)}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors',
            selectedFile === node.id
              ? 'bg-blue-600/20 text-blue-600'
              : 'hover:bg-muted/50'
          )}
          style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
        >
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left truncate">{node.name}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-muted/20 border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Files</h3>
        <button className="p-1 hover:bg-muted rounded">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No files
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
