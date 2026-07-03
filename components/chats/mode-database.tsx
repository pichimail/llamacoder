'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, FileSearch, PlugZap, Table2 } from 'lucide-react'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import { detectDatabaseSchema } from '@/lib/artifact-analysis'
import { toast } from '@/hooks/use-toast'
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

export function ModeDatabase({ chatId, files = [] }: ModeDatabaseProps) {
  const schema = useMemo(() => detectDatabaseSchema(files), [files])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [connectOpen, setConnectOpen] = useState(false)
  const [provider, setProvider] = useState('neon-db')
  const [databaseUrl, setDatabaseUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const activeTable = schema.find((table) => table.name === (selectedTable || schema[0]?.name))
  const schemaFiles = files.filter((file) => /schema\.prisma$|\.sql$|supabase|drizzle|schema/i.test(file.path))

  const connectDatabase = async () => {
    setIsSaving(true)
    try {
      const installResponse = await fetch(`/api/workspace/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-integration', type: provider, config: { installed: true, source: 'database-mode' } }),
      })
      if (!installResponse.ok) throw new Error('Could not install database integration')
      if (databaseUrl.trim()) {
        const envResponse = await fetch(`/api/workspace/${chatId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save-env', key: 'DATABASE_URL', value: databaseUrl.trim() }),
        })
        if (!envResponse.ok) throw new Error('Could not save DATABASE_URL')
      }
      toast({ title: 'Database connected', description: 'Integration and project env var were saved.' })
      setConnectOpen(false)
      setDatabaseUrl('')
    } catch (error) {
      toast({ title: 'Database connection failed', description: error instanceof Error ? error.message : 'Could not save database settings.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (!schema.length) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-card px-4">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Database</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="w-full max-w-md space-y-4">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card">
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">No Database Connected</h2>
              <p className="text-sm text-muted-foreground">
                Connect Neon, Supabase, or Upstash to save credentials and inspect generated schema files here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConnectOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              <PlugZap className="size-4" />
              Connect Database
            </button>
            {connectOpen ? (
              <div className="rounded-lg border border-border bg-card p-3 text-left">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="database-provider">Provider</label>
                <select
                  id="database-provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="neon-db">Neon</option>
                  <option value="supabase">Supabase</option>
                  <option value="upstash">Upstash Redis</option>
                </select>
                <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor="database-url">DATABASE_URL</label>
                <input
                  id="database-url"
                  value={databaseUrl}
                  onChange={(event) => setDatabaseUrl(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  placeholder="postgres://..."
                  type="password"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={connectDatabase}
                  disabled={isSaving}
                  className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Connection'}
                </button>
              </div>
            ) : null}
            {schemaFiles.length > 0 && (
              <div className="rounded-md border border-border p-3 text-left text-xs text-muted-foreground">
                <FileSearch className="mr-1 inline size-3" />
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
              return active ? (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  aria-pressed="true"
                  className="flex w-full items-center gap-2 rounded bg-accent px-2 py-2 text-left text-sm font-mono text-accent-foreground transition-colors"
                >
                  <Table2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{table.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{table.columns.length}</span>
                </button>
              ) : (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  aria-pressed="false"
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-mono text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
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
