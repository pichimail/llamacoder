'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Table, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TooltipProvider, Tip } from '@/components/ui/tooltip'

interface DatabaseModeProps {
  chatId: string
  projectId?: string
}

const mockDatabaseSchema = {
  tables: [
    {
      name: 'User',
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'email', type: 'String', nullable: false, unique: true },
        { name: 'name', type: 'String', nullable: true },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      rowCount: 1245,
    },
    {
      name: 'Chat',
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'title', type: 'String', nullable: false },
        { name: 'prompt', type: 'String', nullable: false },
        { name: 'userId', type: 'String', nullable: false, fk: 'User.id' },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      rowCount: 5823,
    },
    {
      name: 'Message',
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'content', type: 'String', nullable: false },
        { name: 'role', type: 'String', nullable: false },
        { name: 'chatId', type: 'String', nullable: false, fk: 'Chat.id' },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      rowCount: 28934,
    },
    {
      name: 'Project',
      columns: [
        { name: 'id', type: 'String', nullable: false, pk: true },
        { name: 'name', type: 'String', nullable: false },
        { name: 'userId', type: 'String', nullable: false, fk: 'User.id' },
        { name: 'createdAt', type: 'DateTime', nullable: false },
      ],
      rowCount: 342,
    },
  ],
}

interface TableNodeProps {
  table: (typeof mockDatabaseSchema.tables)[0]
  isExpanded: boolean
  onToggle: () => void
}

function TableNode({ table, isExpanded, onToggle }: TableNodeProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Table className="w-4 h-4 opacity-70" />
        <span className="font-medium flex-1">{table.name}</span>
        <span className="text-xs text-muted-foreground">{table.rowCount}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 space-y-1 py-1">
          {table.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-accent/50 rounded"
            >
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  col.pk ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {col.pk ? 'PK' : col.fk ? 'FK' : 'FLD'}
              </span>
              <span className="font-mono">{col.name}</span>
              <span className="text-muted-foreground">{col.type}</span>
              {col.nullable && <span className="text-muted-foreground">?</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DatabaseMode({ chatId, projectId }: DatabaseModeProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['User']))
  const [selectedTable, setSelectedTable] = useState<string>('User')

  const toggleTable = (name: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedTables(newExpanded)
  }

  const table = mockDatabaseSchema.tables.find((t) => t.name === selectedTable)

  return (
    <div className="w-full h-full flex bg-background">
      {/* Schema Navigator */}
      <div className="w-72 border-r border-border flex flex-col bg-muted">
        <div className="h-10 border-b border-border px-4 flex items-center">
          <Database className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Database Schema
          </span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {mockDatabaseSchema.tables.map((table) => (
              <div key={table.name}>
                <button
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors ${
                    selectedTable === table.name
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTable(table.name)
                    }}
                    className="p-0"
                  >
                    {expandedTables.has(table.name) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <Table className="w-4 h-4 opacity-70" />
                  <span className="flex-1 font-medium">{table.name}</span>
                </button>

                {expandedTables.has(table.name) && (
                  <div className="ml-4 space-y-1 py-1">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-center gap-2 px-2 py-1 text-xs rounded text-muted-foreground"
                      >
                        <span className="font-mono text-foreground">{col.name}</span>
                        <span className="text-xs">{col.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Table Inspector */}
      <div className="flex-1 flex flex-col">
        {table && (
          <>
            <div className="h-10 border-b border-border px-4 flex items-center justify-between bg-muted">
              <span className="text-sm font-semibold">{table.name}</span>
              <TooltipProvider>
                <Tip label="Options">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </Tip>
              </TooltipProvider>
            </div>

            {/* Schema Details */}
            <div className="flex-1 overflow-auto">
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Columns</h3>
                  <div className="border border-border rounded overflow-hidden">
                    <UITable>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Constraints</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map((col) => (
                          <TableRow key={col.name}>
                            <TableCell className="text-sm font-mono">
                              {col.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {col.type}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex gap-1">
                                {col.pk && (
                                  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                                    PK
                                  </span>
                                )}
                                {col.unique && (
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                                    UNIQUE
                                  </span>
                                )}
                                {col.fk && (
                                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-medium">
                                    {col.fk}
                                  </span>
                                )}
                                {!col.nullable && (
                                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-medium">
                                    NOT NULL
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </UITable>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded">
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
        )}

        {!table && (
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
