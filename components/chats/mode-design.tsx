'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Palette, Type, Spacing } from 'lucide-react'

interface DesignToken {
  name: string
  value: string
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow'
}

interface ModeDesignProps {
  chatId: string
}

const defaultTokens: DesignToken[] = [
  // Colors
  { name: 'primary', value: '#000000', category: 'color' },
  { name: 'secondary', value: '#666666', category: 'color' },
  { name: 'accent', value: '#0066cc', category: 'color' },
  { name: 'background', value: '#ffffff', category: 'color' },
  { name: 'foreground', value: '#000000', category: 'color' },
  { name: 'muted', value: '#f5f5f5', category: 'color' },
  { name: 'border', value: '#e0e0e0', category: 'color' },
  // Typography
  { name: 'font-sans', value: 'Inter, sans-serif', category: 'typography' },
  { name: 'font-mono', value: 'Fira Code, monospace', category: 'typography' },
  // Spacing
  { name: 'spacing-xs', value: '4px', category: 'spacing' },
  { name: 'spacing-sm', value: '8px', category: 'spacing' },
  { name: 'spacing-md', value: '16px', category: 'spacing' },
  { name: 'spacing-lg', value: '24px', category: 'spacing' },
  // Radius
  { name: 'radius-sm', value: '4px', category: 'radius' },
  { name: 'radius-md', value: '8px', category: 'radius' },
  { name: 'radius-lg', value: '12px', category: 'radius' },
]

export function ModeDesign({ chatId }: ModeDesignProps) {
  const [tokens, setTokens] = useState(defaultTokens)
  const [editingToken, setEditingToken] = useState<string | null>(null)

  const colorTokens = tokens.filter((t) => t.category === 'color')
  const typographyTokens = tokens.filter((t) => t.category === 'typography')
  const spacingTokens = tokens.filter((t) => t.category === 'spacing')
  const radiusTokens = tokens.filter((t) => t.category === 'radius')

  const handleUpdateToken = (name: string, value: string) => {
    setTokens(tokens.map((t) => (t.name === name ? { ...t, value } : t)))
    setEditingToken(null)
  }

  return (
    <div className="w-full h-full flex bg-background overflow-hidden">
      {/* Design Canvas */}
      <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
        {/* Canvas Header */}
        <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between">
          <span className="text-sm font-semibold">Design System Preview</span>
          <Button size="sm" variant="outline" className="h-7">
            Reset to Defaults
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">
            {/* Color Palette Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Colors</h3>
              <div className="grid grid-cols-2 gap-3">
                {colorTokens.map((token) => (
                  <div key={token.name} className="space-y-2">
                    <div
                      className="w-full h-24 rounded border border-border"
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="text-xs">
                      <p className="font-mono font-semibold">{token.name}</p>
                      <p className="text-muted-foreground">{token.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Typography</h3>
              <div className="space-y-2">
                {typographyTokens.map((token) => (
                  <div
                    key={token.name}
                    className="p-4 rounded border border-border"
                    style={{ fontFamily: token.value }}
                  >
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                    <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Spacing Scale</h3>
              <div className="space-y-3">
                {spacingTokens.map((token) => (
                  <div key={token.name} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-mono text-muted-foreground">
                      {token.name}
                    </div>
                    <div
                      className="bg-accent rounded"
                      style={{ width: token.value, height: '20px' }}
                    />
                    <span className="text-xs text-muted-foreground">{token.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Design Panel */}
      <div className="w-80 border-r border-border bg-muted flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="h-10 border-b border-border bg-card px-4 flex items-center">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Design Tokens
          </span>
        </div>

        {/* Token Editor */}
        <ScrollArea className="flex-1">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="w-full rounded-none border-b bg-background">
              <TabsTrigger value="colors" className="flex-1 text-xs">
                <Palette className="w-3 h-3 mr-1" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex-1 text-xs">
                <Type className="w-3 h-3 mr-1" />
                Type
              </TabsTrigger>
              <TabsTrigger value="spacing" className="flex-1 text-xs">
                <Spacing className="w-3 h-3 mr-1" />
                Spacing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="p-4 space-y-3">
              {colorTokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <Label className="text-xs font-medium capitalize">{token.name}</Label>
                  <div className="flex gap-2">
                    <div
                      className="w-10 h-10 rounded border border-border cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: token.value }}
                      onClick={() => setEditingToken(token.name)}
                    />
                    {editingToken === token.name ? (
                      <Input
                        value={token.value}
                        onChange={(e) => handleUpdateToken(token.name, e.target.value)}
                        onBlur={() => setEditingToken(null)}
                        className="h-10 text-xs font-mono flex-1"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="flex-1 flex items-center px-2 rounded border border-border text-xs font-mono text-muted-foreground cursor-pointer hover:bg-background"
                        onClick={() => setEditingToken(token.name)}
                      >
                        {token.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="typography" className="p-4 space-y-3">
              {typographyTokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <Label className="text-xs font-medium capitalize">{token.name}</Label>
                  <Input
                    value={token.value}
                    onChange={(e) => handleUpdateToken(token.name, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="spacing" className="p-4 space-y-3">
              {spacingTokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <Label className="text-xs font-medium capitalize">{token.name}</Label>
                  <Input
                    value={token.value}
                    onChange={(e) => handleUpdateToken(token.name, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </div>
  )
}
