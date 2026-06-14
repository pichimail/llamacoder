'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, Table2, Key, Link2, FileSearch } from 'lucide-react'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import { detectDatabaseSchema } from '@/lib/artifact-analysis'

interface ModeDatabaseProps {
  chatId: string
  files?: ArtifactFile[]
}

export function ModeDatabase({ files = [] }: ModeDatabaseProps) {
  const schema = useMemo(() => detectDatabaseSchema(files), [files])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const activeTable = schema.find((table) => table.name === (selectedTable || schema[0]?.name))
  const schemaFiles = files.filter((file) => /schema\.prisma$|\.sql$|supabase|drizzle|schema/i.test(file.path))

  if (!schema.length) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-card px-4">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Database</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-3">
            <FileSearch className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="text-sm font-semibold">No database schema in this artifact</h2>
            <p className="text-sm text-muted-foreground">
              Database mode now reads only real schema files from the generated app. Add a Prisma, SQL, Supabase, or Drizzle schema in the artifact and it will appear here.
            </p>
            {schemaFiles.length > 0 && (
              <div className="rounded-md border border-border p-3 text-left text-xs text-muted-foreground">
                Found related files: {schemaFiles.map((file) => file.path).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-card md:w-64" aria-label="Database tables">
        <div className="flex h-10 items-center border-b border-border px-3">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Tables</span>
        </div>
        <ScrollArea className="h-[calc(100%-2.5rem)]">
          <div className="space-y-1 p-2">
            {schema.map((table) => {
              const active = activeTable?.name === table.name
              return (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-mono transition-colors ${
                    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{table.name}</span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Schema inspector">
        {activeTable && (
          <>
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
              <Table2 className="h-4 w-4" />
              <h3 className="truncate text-sm font-semibold">{activeTable.name}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">{activeTable.columns.length} columns</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-8 p-4 md:p-6">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Database className="h-4 w-4" />
                    Columns
                  </h4>
                  <div className="overflow-hidden rounded-md border border-border">
                    {activeTable.columns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2 text-sm last:border-0">
                        <span className="min-w-0 truncate font-mono">{col.name}</span>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <Badge variant="secondary" className="font-mono text-[11px]">{col.type}</Badge>
                          {col.isPrimary && <Badge variant="outline" className="text-[11px]"><Key className="mr-1 h-3 w-3" />PK</Badge>}
                          {col.isForeign && <Badge variant="outline" className="text-[11px]">FK</Badge>}
                          {!col.nullable && <Badge variant="outline" className="text-[11px]">Required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeTable.relations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Link2 className="h-4 w-4" />
                      Relations
                    </h4>
                    <div className="overflow-hidden rounded-md border border-border">
                      {activeTable.relations.map((rel) => (
                        <div key={rel.name} className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-sm last:border-0">
                          <span className="font-mono">{rel.name}</span>
                          <Badge variant="outline" className="text-[11px]">{rel.relatedTable}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </section>
    </div>
  )
}
