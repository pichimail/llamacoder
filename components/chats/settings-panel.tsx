'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Zap, Github, Lock, Database, Settings as SettingsIcon, X, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import { detectDatabaseSchema } from '@/lib/artifact-analysis'

interface SettingsPanelProps {
  chatId: string
  chatTitle?: string
  chatModel?: string
  files?: ArtifactFile[]
  onClose?: () => void
}

export function SettingsPanel({ chatId, chatTitle, chatModel, files = [], onClose }: SettingsPanelProps) {
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([])
  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')
  const schemaCount = useMemo(() => detectDatabaseSchema(files).length, [files])
  const hasVercelFiles = files.some((file) => /vercel|next\.config|package\.json/i.test(file.path))
  const hasGithubFiles = files.some((file) => /\.github|README|package\.json/i.test(file.path))

  const addEnv = () => {
    const key = draftKey.trim()
    if (!key) return
    setEnvVars((current) => [...current.filter((item) => item.key !== key), { key, value: draftValue }])
    setDraftKey('')
    setDraftValue('')
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Settings & Integrations</span>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} aria-label="Close settings panel">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-10 shrink-0 grid-cols-3 rounded-none border-b bg-background">
          <TabsTrigger value="general" className="text-xs"><SettingsIcon className="mr-1 h-3 w-3" />General</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs"><Zap className="mr-1 h-3 w-3" />Integrations</TabsTrigger>
          <TabsTrigger value="env" className="text-xs"><Lock className="mr-1 h-3 w-3" />Env</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="general" className="m-0 space-y-4 p-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Current Artifact</h4>
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input value={chatTitle || ''} readOnly className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Model</Label>
                  <Input value={chatModel || 'Current model'} readOnly className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Files</Label>
                  <Input value={`${files.length}`} readOnly className="h-8 text-xs" />
                </div>
              </div>
              <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                Workspace changes are saved as a new artifact version, preserving previous generated versions.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="m-0 space-y-4 p-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Connected Services</h4>
              <IntegrationCard
                name="GitHub"
                icon={<Github className="h-4 w-4" />}
                status={hasGithubFiles ? 'available' : 'not-configured'}
                description={hasGithubFiles ? 'Artifact includes repository-ready files' : 'No repository workflow detected'}
              />
              <IntegrationCard
                name="Database"
                icon={<Database className="h-4 w-4" />}
                status={schemaCount > 0 ? 'available' : 'not-configured'}
                description={schemaCount > 0 ? `${schemaCount} schema table${schemaCount === 1 ? '' : 's'} detected` : 'No schema file detected'}
              />
              <IntegrationCard
                name="Vercel"
                icon={<Zap className="h-4 w-4" />}
                status={hasVercelFiles ? 'available' : 'not-configured'}
                description={hasVercelFiles ? 'Artifact contains deployable web app files' : 'Generate package/app files first'}
              />
            </div>
          </TabsContent>

          <TabsContent value="env" className="m-0 space-y-4 p-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Environment Variables</h4>
              <p className="text-xs text-muted-foreground">Saved locally in this workspace panel for now. Project-backed env persistence can use the existing Project EnvironmentVariable model when a project is attached.</p>

              <div className="grid gap-2">
                <Input value={draftKey} onChange={(e) => setDraftKey(e.target.value)} placeholder="KEY" className="h-8 text-xs font-mono" aria-label="Environment variable key" />
                <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} placeholder="Value" type="password" className="h-8 text-xs font-mono" aria-label="Environment variable value" />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addEnv} disabled={!draftKey.trim()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Variable
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                {envVars.length > 0 ? (
                  envVars.map((v) => (
                    <div key={v.key} className="flex items-center gap-2 rounded border border-border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs">{v.key}</p>
                        <p className="text-xs text-muted-foreground">••••••••</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEnvVars((current) => current.filter((item) => item.key !== v.key))} aria-label={`Remove ${v.key}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">No environment variables set</p>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

interface IntegrationCardProps {
  name: string
  icon: React.ReactNode
  status: 'available' | 'not-configured'
  description: string
}

function IntegrationCard({ name, icon, status, description }: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between rounded border border-border bg-background p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Badge variant={status === 'available' ? 'secondary' : 'outline'} className="text-[11px]">
        {status === 'available' ? 'Ready' : 'Not set'}
      </Badge>
    </div>
  )
}
