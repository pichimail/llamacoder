'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, Table2, Key, Link2 } from 'lucide-react'

interface TableColumn {
  name: string
  type: string
  nullable: boolean
  isPrimary?: boolean
  isForeign?: boolean
}

interface TableSchema {
  name: string
  columns: TableColumn[]
  relations: { name: string; relatedTable: string }[]
  rowCount?: number
}

interface ModeDatabaseProps {
  chatId: string
}

const defaultSchema: TableSchema[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'String', nullable: false, isPrimary: true },
      { name: 'email', type: 'String', nullable: false },
      { name: 'name', type: 'String', nullable: true },
      { name: 'createdAt', type: 'DateTime', nullable: false },
    ],
    relations: [],
    rowCount: 1250,
  },
  {
    name: 'projects',
    columns: [
      { name: 'id', type: 'String', nullable: false, isPrimary: true },
      { name: 'name', type: 'String', nullable: false },
      { name: 'userId', type: 'String', nullable: false, isForeign: true },
      { name: 'createdAt', type: 'DateTime', nullable: false },
    ],
    relations: [{ name: 'user', relatedTable: 'users' }],
    rowCount: 342,
  },
  {
    name: 'chats',
    columns: [
      { name: 'id', type: 'String', nullable: false, isPrimary: true },
      { name: 'title', type: 'String', nullable: false },
      { name: 'projectId', type: 'String', nullable: true, isForeign: true },
      { name: 'createdAt', type: 'DateTime', nullable: false },
    ],
    relations: [{ name: 'project', relatedTable: 'projects' }],
    rowCount: 5823,
  },
  {
    name: 'messages',
    columns: [
      { name: 'id', type: 'String', nullable: false, isPrimary: true },
      { name: 'content', type: 'String', nullable: false },
      { name: 'chatId', type: 'String', nullable: false, isForeign: true },
      { name: 'createdAt', type: 'DateTime', nullable: false },
    ],
    relations: [{ name: 'chat', relatedTable: 'chats' }],
    rowCount: 28934,
  },
]

export function ModeDatabase({ chatId }: ModeDatabaseProps) {
  const [selectedTable, setSelectedTable] = useState<string>(defaultSchema[0].name)

  const activeTable = defaultSchema.find((t) => t.name === selectedTable)

  return (
    <div className="w-full h-full flex bg-background overflow-hidden">
      {/* Table List */}
      <div className="w-64 border-r border-border bg-muted flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-10 border-b border-border bg-card px-4 flex items-center">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Tables
          </span>
        </div>

        {/* Table List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {defaultSchema.map((table) => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`w-full text-left p-2 rounded transition-colors text-sm font-mono ${
                  selectedTable === table.name
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-background'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Table2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{table.name}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Schema Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTable ? (
          <>
            {/* Header */}
            <div className="h-10 border-b border-border bg-card px-6 flex items-center gap-3">
              <Table2 className="w-4 h-4" />
              <div>
                <h3 className="font-semibold text-sm">{activeTable.name}</h3>
              </div>
              {activeTable.rowCount && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {activeTable.rowCount.toLocaleString()} rows
                </Badge>
              )}
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Columns */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Columns
                  </h4>
                  <div className="space-y-1 ml-6">
                    {activeTable.columns.map((col) => (
                      <div
                        key={col.name}
                        className="text-sm font-mono py-2 border-b border-border/30 pb-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">{col.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {col.type}
                            </Badge>
                            {col.isPrimary && (
                              <Badge variant="outline" className="text-xs">
                                PK
                              </Badge>
                            )}
                            {col.isForeign && (
                              <Badge variant="outline" className="text-xs">
                                FK
                              </Badge>
                            )}
                            {!col.nullable && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relations */}
                {activeTable.relations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Relations
                    </h4>
                    <div className="space-y-1 ml-6">
                      {activeTable.relations.map((rel) => (
                        <div
                          key={rel.name}
                          className="text-sm font-mono py-2 border-b border-border/30 pb-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground">{rel.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {rel.relatedTable}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a table to view schema</p>
          </div>
        )}
      </div>
    </div>
  )
}
