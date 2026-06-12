'use client'

import { useState, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Palette, Type, Grid2x2, Radius, Eye, RotateCcw, Check } from 'lucide-react'

interface DesignModeProps {
  chatId: string
  projectId?: string
  messages?: any[]
}

interface SelectedElement {
  path: string[]
  tagName: string
  classes: string[]
  styles: Record<string, string>
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

const aiPromptChips = [
  '/modern', '/contrast', '/spacious', '/simplify', '/readable', 
  '/shadows', '/pop', '/hierarchy'
]

export function DesignMode({ chatId, projectId, messages = [] }: DesignModeProps) {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [aiInstructions, setAiInstructions] = useState('')
  const [previewActive, setPreviewActive] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const handleElementPick = () => {
    if (iframeRef.current) {
      // Enable element picker mode in iframe
      // This would trigger a picker overlay in the preview
    }
  }

  const handlePreview = () => setPreviewActive(true)
  const handleReset = () => {
    setAiInstructions('')
    setSelectedElement(null)
  }
  const handleApply = async () => {
    if (aiInstructions.trim()) {
      // Send instruction to AI to generate design patch
      console.log('[v0] Applying design instructions:', aiInstructions)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-10 border-b border-border px-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleElementPick} className="h-8">
            <Eye className="w-4 h-4 mr-2" />
            Pick Element
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {selectedElement && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePreview} className="h-8">
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleApply} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                <Check className="w-4 h-4 mr-1" />
                Apply
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-white overflow-hidden">
            {selectedElement ? (
              <div className="p-8 bg-white h-full overflow-auto flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">Preview of selected element</p>
                  <p className="text-xs mt-2">&lt;{selectedElement.tagName}&gt;</p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-white h-full overflow-auto flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Select an element to inspect and edit</p>
                  <p className="text-xs mt-2">Click "Pick Element" to start</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-96 border-l border-border bg-muted flex flex-col">
          <ScrollArea className="flex-1">
            <Tabs defaultValue="inspect" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-background">
                <TabsTrigger value="inspect" className="flex-1 text-xs">
                  Inspect
                </TabsTrigger>
                <TabsTrigger value="styles" className="flex-1 text-xs">
                  Styles
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex-1 text-xs">
                  AI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inspect" className="p-4 space-y-4">
                {selectedElement ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Element Path</Label>
                      <div className="text-xs font-mono bg-background p-2 rounded border border-border overflow-x-auto">
                        {selectedElement.path.join(' > ')} {'>'} {selectedElement.tagName}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Classes</Label>
                      <div className="text-xs bg-background p-2 rounded border border-border break-words">
                        {selectedElement.classes.join(' ') || '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No element selected</p>
                )}
              </TabsContent>

              <TabsContent value="styles" className="p-4 space-y-3">
                {selectedElement ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Typography</Label>
                      <div className="space-y-1 text-xs">
                        <div>Font Size: {selectedElement.styles['font-size'] || '—'}</div>
                        <div>Font Weight: {selectedElement.styles['font-weight'] || '—'}</div>
                        <div>Line Height: {selectedElement.styles['line-height'] || '—'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Colors</Label>
                      <div className="space-y-1 text-xs">
                        <div>Text: {selectedElement.styles['color'] || '—'}</div>
                        <div>Background: {selectedElement.styles['background-color'] || '—'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Spacing</Label>
                      <div className="space-y-1 text-xs">
                        <div>Padding: {selectedElement.styles['padding'] || '—'}</div>
                        <div>Margin: {selectedElement.styles['margin'] || '—'}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No element selected</p>
                )}
              </TabsContent>

              <TabsContent value="ai" className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Design Instructions</Label>
                  <Textarea
                    placeholder="Describe design changes..."
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    className="text-xs h-24 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Quick Prompts</Label>
                  <div className="flex flex-wrap gap-1">
                    {aiPromptChips.map((chip) => (
                      <Button
                        key={chip}
                        variant="outline"
                        size="sm"
                        onClick={() => setAiInstructions((prev) => (prev ? `${prev} ${chip}` : chip))}
                        className="text-xs h-6 px-2"
                      >
                        {chip}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
