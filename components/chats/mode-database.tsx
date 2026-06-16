'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, Table2, FileSearch } from 'lucide-react'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import { detectDatabaseSchema } from '@/lib/artifact-analysis'
import {
  SchemaDisplay,
  SchemaDisplayBody,
  SchemaDisplayContent,
  SchemaDisplayHeader,
  SchemaDisplayMethod,
  SchemaDisplayPath,
  SchemaDisplayProperty,
} from '@/components/ai-elements/schema-display'

interface ModeDatabaseProps {
  chatId: string
  files?: ArtifactFile[]
}

function columnDescription(column: {
  isPrimary?: boolean
  isForeign?: boolean
  nullable: boolean
}) {
  const parts = [
    column.isPrimary ? 'Primary key' : null,
    column.isForeign ? 'Foreign key' : null,
    column.nullable ? 'Nullable' : 'Required',
  ].filter(Boolean)
  return parts.join(' · ')
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
              Database mode reads Prisma, SQL, Supabase, or Drizzle schema files from the generated app.
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
          <Badge variant="secondary" className="ml-auto text-[10px]">{schema.length}</Badge>
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
                  <span className="ml-auto text-[10px] text-muted-foreground">{table.columns.length}</span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Schema inspector">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4 md:p-6">
            {activeTable ? (
              <SchemaDisplay
                method="GET"
                path={`/schema/${activeTable.name}`}
                description={`${activeTable.columns.length} columns${activeTable.relations.length ? ` · ${activeTable.relations.length} relations` : ''}`}
              >
                <SchemaDisplayHeader>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SchemaDisplayMethod>TBL</SchemaDisplayMethod>
                    <Table2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <SchemaDisplayPath>{activeTable.name}</SchemaDisplayPath>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activeTable.columns.length} cols
                  </Badge>
                </SchemaDisplayHeader>
                <SchemaDisplayContent>
                  <SchemaDisplayBody>
                    {activeTable.columns.map((column) => (
                      <SchemaDisplayProperty
                        key={column.name}
                        name={column.name}
                        type={column.type}
                        required={!column.nullable}
                        description={columnDescription(column)}
                      />
                    ))}
                    {activeTable.relations.map((relation) => (
                      <SchemaDisplayProperty
                        key={`${relation.name}-${relation.relatedTable}`}
                        name={relation.name}
                        type="relation"
                        description={`References ${relation.relatedTable}`}
                      />
                    ))}
                  </SchemaDisplayBody>
                </SchemaDisplayContent>
              </SchemaDisplay>
            ) : null}

            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Database className="size-3.5" aria-hidden="true" />
                All tables
              </h4>
              <div className="grid gap-3 lg:grid-cols-2">
                {schema.map((table) => (
                  <SchemaDisplay
                    key={table.name}
                    method="GET"
                    path={`/schema/${table.name}`}
                    className={activeTable?.name === table.name ? 'ring-1 ring-ring' : undefined}
                  >
                    <SchemaDisplayHeader className="cursor-pointer py-2" onClick={() => setSelectedTable(table.name)}>
                      <SchemaDisplayMethod>TBL</SchemaDisplayMethod>
                      <SchemaDisplayPath>{table.name}</SchemaDisplayPath>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {table.columns.length}
                      </Badge>
                    </SchemaDisplayHeader>
                    <SchemaDisplayContent>
                      <SchemaDisplayBody>
                        {table.columns.slice(0, 6).map((column) => (
                          <SchemaDisplayProperty
                            key={column.name}
                            name={column.name}
                            type={column.type}
                            required={!column.nullable}
                          />
                        ))}
                        {table.columns.length > 6 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTable(table.name)}
                            className="w-full px-4 py-2 text-left text-xs text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                          >
                            +{table.columns.length - 6} more columns
                          </button>
                        ) : null}
                      </SchemaDisplayBody>
                    </SchemaDisplayContent>
                  </SchemaDisplay>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </section>
    </div>
  )
}