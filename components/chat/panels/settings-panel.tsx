'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Zap,
  Lock,
  Globe,
  BarChart2,
  Plus,
  Trash2,
} from 'lucide-react'

interface SettingsPanelProps {
  chatId: string
}

export function SettingsPanel({ chatId }: SettingsPanelProps) {
  return (
    <div className="h-full flex flex-col bg-muted">
      <div className="h-10 border-b border-border px-4 flex items-center">
        <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Settings
        </span>
      </div>

      <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b bg-background">
          <TabsTrigger value="general" className="flex-1">
            <Settings className="w-4 h-4 mr-1" />
            General
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1">
            <Zap className="w-4 h-4 mr-1" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="env" className="flex-1">
            <Lock className="w-4 h-4 mr-1" />
            Env Vars
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* General Tab */}
          <TabsContent value="general" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Chat Model</Label>
              <Select defaultValue="gpt-4">
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude">Claude 3</SelectItem>
                  <SelectItem value="llama">Llama 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Temperature</Label>
              <Input type="range" min="0" max="1" step="0.1" defaultValue="0.7" />
              <p className="text-xs text-muted-foreground">0 = Deterministic, 1 = Creative</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Max Tokens</Label>
              <Input
                type="number"
                placeholder="4096"
                className="h-9 text-sm"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chat
              </Button>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="p-4 space-y-3">
            {['Vercel', 'GitHub', 'Stripe', 'Supabase'].map((integration) => (
              <div
                key={integration}
                className="flex items-center justify-between p-3 rounded border border-border bg-background"
              >
                <div className="flex items-center gap-2">
                  {integration === 'GitHub' && <Globe className="w-5 h-5" />}
                  {integration === 'Vercel' && <Globe className="w-5 h-5" />}
                  {integration === 'Stripe' && <Zap className="w-5 h-5" />}
                  {integration === 'Supabase' && <BarChart2 className="w-5 h-5" />}
                  <div>
                    <p className="text-sm font-medium">{integration}</p>
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Connect
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Environment Variables Tab */}
          <TabsContent value="env" className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Environment Variables</Label>
                <Button size="sm" variant="outline" className="h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'DATABASE_URL', value: 'postgres://...' },
                  { key: 'API_KEY', value: '****' },
                  { key: 'SECRET_TOKEN', value: '****' },
                ].map((envVar, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-background border border-border text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-mono text-xs">{envVar.key}</p>
                      <p className="text-xs text-muted-foreground">{envVar.value}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded bg-background border border-border text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Security</p>
              <p>Variables are encrypted and never logged.</p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
