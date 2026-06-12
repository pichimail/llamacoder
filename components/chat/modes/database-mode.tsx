'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Table as TableIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DatabaseModeProps {
  chatId: string
  projectId?: string
}

type SchemaColumn = {
  name: string
  type: string
  nullable: boolean
  pk?: boolean
  unique?: boolean
  fk?: string
}

type SchemaTable = {
  name: string
  columns: SchemaColumn[]
  relations: string[]
  rowCount: number
}

const prismaSchema: { tables: SchemaTable[] } = {
  tables: [
    {
      name: 'User',
      rowCount: 0,
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'email', type: 'String', nullable: true, unique: true },
        { name: 'emailVerified', type: 'DateTime', nullable: true },
        { name: 'name', type: 'String', nullable: true },
        { name: 'image', type: 'String', nullable: true },
        { name: 'plan', type: 'String', nullable: false },
        { name: 'role', type: 'String', nullable: false },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      relations: ['accounts', 'sessions', 'projects', 'projectMembers'],
    },
    {
      name: 'Chat',
      rowCount: 0,
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'title', type: 'String', nullable: false },
        { name: 'prompt', type: 'String', nullable: false },
        { name: 'model', type: 'String', nullable: false },
        { name: 'quality', type: 'String', nullable: false },
        { name: 'projectId', type: 'String', nullable: true, fk: 'Project' },
        { name: 'isPinned', type: 'Boolean', nullable: false },
        { name: 'isArchived', type: 'Boolean', nullable: false },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      relations: ['messages', 'project'],
    },
    {
      name: 'Message',
      rowCount: 0,
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'role', type: 'String', nullable: false },
        { name: 'content', type: 'String', nullable: false },
        { name: 'files', type: 'Json', nullable: true },
        { name: 'position', type: 'Int', nullable: false },
        { name: 'chatId', type: 'String', nullable: false, fk: 'Chat' },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      relations: ['chat'],
    },
    {
      name: 'Project',
      rowCount: 0,
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'name', type: 'String', nullable: false },
        { name: 'description', type: 'String', nullable: true },
        { name: 'userId', type: 'String', nullable: false, fk: 'User' },
        { name: 'createdAt', type: 'DateTime', nullable: false },
        { name: 'updatedAt', type: 'DateTime', nullable: false },
      ],
      relations: ['user', 'chats', 'files', 'envVars', 'integrations', 'domains', 'members'],
    },
    {
      name: 'ProjectFile',
      rowCount: 0,
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'path', type: 'String', nullable: false },
        { name: 'content', type: 'String', nullable: false },
        { name: 'projectId', type: 'String', nullable: false, fk: 'Project' },
      ],
      relations: ['project'],
    },
    {
      name: 'EnvironmentVariable',
      rowCount: 0,
      columns: [
        { name: 'key', type: 'String', nullable: false, pk: true },
        { name: 'value', type: 'String', nullable: false },
        { name: 'projectId', type: 'String', nullable: false, pk: true, fk: 'Project' },
        { name: 'updatedAt', type: 'DateTime', nullable: false },
      ],
      relations: ['project'],
    },
  ],
}

export function DatabaseMode({ chatId, projectId }: DatabaseModeProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['User']))
  const [selectedTable, setSelectedTable] = useState<string>('User')

  const toggleTable = (name: string) => {
    const nextExpanded = new Set(expandedTables)
    if (nextExpanded.has(name)) {
      nextExpanded.delete(name)
    } else {
      nextExpanded.add(name)
    }
    setExpandedTables(nextExpanded)
  }

  const table = prismaSchema.tables.find((item) => item.name === selectedTable)

  return (
    <div className="w-full h-full flex bg-background">
      <div className="w-72 border-r border-border flex flex-col bg-muted">
        <div className="h-10 border-b border-border px-4 flex items-center">
          <Database className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Database Schema
          </span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {prismaSchema.tables.map((item) => (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => setSelectedTable(item.name)}
                  className={`w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors ${
                    selectedTable === item.name ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleTable(item.name)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        toggleTable(item.name)
                      }
                    }}
                    className="p-0"
                  >
                    {expandedTables.has(item.name) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                  <TableIcon className="w-4 h-4 opacity-70" />
                  <span className="flex-1 font-medium text-left">{item.name}</span>
                </button>

                {expandedTables.has(item.name) && (
                  <div className="ml-4 space-y-1 py-1">
                    {item.columns.map((column) => (
                      <div
                        key={column.name}
                        className="flex items-center gap-2 px-2 py-1 text-xs rounded text-muted-foreground"
                      >
                        <span className="font-mono text-foreground">{column.name}</span>
                        <span className="text-xs">{column.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {table ? (
          <>
            <div className="h-10 border-b border-border px-4 flex items-center justify-between bg-muted">
              <span className="text-sm font-semibold">{table.name}</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled>
                Inspect
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Columns</h3>
                  <div className="border border-border rounded overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Constraints</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell className="text-sm font-mono">{column.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {column.type}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex gap-1 flex-wrap">
                                {column.pk && <Badge variant="outline">PK</Badge>}
                                {column.unique && <Badge variant="outline">UNIQUE</Badge>}
                                {column.fk && <Badge variant="outline">{column.fk}</Badge>}
                                {!column.nullable && <Badge variant="outline">NOT NULL</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Total Rows</p>
                    <p className="text-2xl font-bold">{table.rowCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Columns</p>
                    <p className="text-2xl font-bold">{table.columns.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Select a table to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
