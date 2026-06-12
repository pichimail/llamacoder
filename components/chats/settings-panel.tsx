'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Zap, Github, Lock, Database, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'

interface SettingsPanelProps {
  chatId: string
  onClose?: () => void
}

export function SettingsPanel({ chatId, onClose }: SettingsPanelProps) {
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([])

  return (
    <div className="w-full h-full flex flex-col bg-muted overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Settings & Integrations
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-background">
            <TabsTrigger value="general" className="flex-1 text-xs">
              <SettingsIcon className="w-3 h-3 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex-1 text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="env" className="flex-1 text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Env Vars
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="p-4 space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase">Chat Settings</h4>
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input placeholder="Chat title" className="h-8 text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Model</Label>
                <Input placeholder="gpt-4-turbo" className="h-8 text-xs" disabled />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold uppercase text-red-600">Danger Zone</h4>
              <Button variant="destructive" size="sm" className="w-full h-8">
                Delete Chat
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="p-4 space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold mb-3">Connected Services</h4>

              {/* Integration items */}
              <IntegrationCard
                name="GitHub"
                icon={<Github className="w-4 h-4" />}
                status="connected"
                description="Deploy to GitHub Pages"
              />
              <IntegrationCard
                name="Database"
                icon={<Database className="w-4 h-4" />}
                status="available"
                description="Connect to PostgreSQL"
              />
              <IntegrationCard
                name="Vercel"
                icon={<Zap className="w-4 h-4" />}
                status="available"
                description="Deploy to Vercel"
              />
            </div>
          </TabsContent>

          <TabsContent value="env" className="p-4 space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold">Environment Variables</h4>
              <p className="text-xs text-muted-foreground">
                Add secret keys and configuration for your integrations
              </p>

              <div className="space-y-2 mt-4">
                {envVars.length > 0 ? (
                  envVars.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={v.key}
                        placeholder="Key"
                        className="h-8 text-xs flex-1"
                        readOnly
                      />
                      <Input
                        value={v.value}
                        placeholder="Value (hidden)"
                        type="password"
                        className="h-8 text-xs flex-1"
                        readOnly
                      />
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        ✕
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No environment variables set
                  </p>
                )}
              </div>

              <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                Add Variable
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  )
}

interface IntegrationCardProps {
  name: string
  icon: React.ReactNode
  status: 'connected' | 'available'
  description: string
}

function IntegrationCard({
  name,
  icon,
  status,
  description,
}: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded border border-border bg-background">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {status === 'connected' ? (
        <Badge variant="default" className="text-xs">
          Connected
        </Badge>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs">
          Connect
        </Button>
      )}
    </div>
  )
}
