'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Palette, Type, Grid2x2, Radius, Droplet } from 'lucide-react'

interface DesignModeProps {
  chatId: string
  projectId?: string
}

const designTokens = {
  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#0066cc',
    background: '#ffffff',
    foreground: '#000000',
    muted: '#f5f5f5',
    border: '#e0e0e0',
  },
  typography: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'Fira Code, monospace',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
}

export function DesignMode({ chatId, projectId }: DesignModeProps) {
  return (
    <div className="w-full h-full flex bg-background">
      {/* Component Library */}
      <div className="w-64 border-r border-border flex flex-col bg-muted">
        <div className="h-10 border-b border-border px-4 flex items-center">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Components
          </span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {['Button', 'Input', 'Card', 'Dialog', 'Dropdown', 'Tabs', 'Alert', 'Badge'].map(
              (comp) => (
                <div
                  key={comp}
                  className="p-2 rounded bg-background hover:bg-accent cursor-move transition-colors text-sm"
                >
                  {comp}
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Design Editor */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 p-8 overflow-auto bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Component Preview</h2>
                <div className="space-y-4">
                  <Button>Default Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Color Palette</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(designTokens.colors).map(([name, value]) => (
                    <div key={name} className="space-y-2">
                      <div
                        className="w-full h-12 rounded border border-border"
                        style={{ backgroundColor: value }}
                      />
                      <p className="text-xs text-muted-foreground">{name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Design Panel */}
        <div className="w-80 border-l border-border bg-muted flex flex-col">
          <div className="h-10 border-b border-border px-4 flex items-center">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Design System
            </span>
          </div>

          <ScrollArea className="flex-1">
            <Tabs defaultValue="colors" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-background">
                <TabsTrigger value="colors" className="flex-1">
                  <Palette className="w-4 h-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex-1">
                  <Type className="w-4 h-4 mr-2" />
                  Type
                </TabsTrigger>
                <TabsTrigger value="spacing" className="flex-1">
                  <Spacing className="w-4 h-4 mr-2" />
                  Space
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="p-4 space-y-3">
                {Object.entries(designTokens.colors).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label className="text-xs font-medium capitalize">{name}</Label>
                    <div className="flex gap-2">
                      <div
                        className="w-10 h-10 rounded border border-border cursor-pointer"
                        style={{ backgroundColor: value }}
                      />
                      <Input value={value} readOnly className="text-xs font-mono" />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="typography" className="p-4 space-y-4">
                {Object.entries(designTokens.typography).map(([name, font]) => (
                  <div key={name} className="space-y-2">
                    <Label className="text-xs font-medium capitalize">{name}</Label>
                    <div className="p-3 rounded border border-border bg-background text-sm" style={{ fontFamily: font }}>
                      Font: {font}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="spacing" className="p-4 space-y-3">
                {Object.entries(designTokens.spacing).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label className="text-xs font-medium capitalize">{name}</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="bg-accent rounded"
                        style={{ width: value, height: '24px' }}
                      />
                      <span className="text-xs font-mono text-muted-foreground">{value}</span>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
