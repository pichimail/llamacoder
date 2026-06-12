'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Globe, Lock } from 'lucide-react'
import { useState } from 'react'

interface SharePanelProps {
  chatId: string
  onClose?: () => void
}

export function SharePanel({ chatId, onClose }: SharePanelProps) {
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [shareUrl, setShareUrl] = useState(`https://llamacoder.app/share/${chatId}`)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVisibilityChange = (value: string) => {
    setVisibility(value as 'private' | 'public')
  }

  return (
    <div className="w-full h-full flex flex-col bg-muted overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Share & Collaborate
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Visibility Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase">Visibility</h3>
            <Select value={visibility} onValueChange={handleVisibilityChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    Public Link
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {visibility === 'private'
                ? 'Only you can access this chat'
                : 'Anyone with the link can view this chat'}
            </p>
          </div>

          {/* Share Link */}
          {visibility === 'public' && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="h-8 text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8 px-2"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Copied to clipboard!
                </p>
              )}
            </div>
          )}

          {/* Collaborators */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase">People with access</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-background">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                    Y
                  </div>
                  <div>
                    <p className="text-xs font-medium">You</p>
                    <p className="text-xs text-muted-foreground">Owner</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">you@example.com</span>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="space-y-2 p-3 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
              How does sharing work?
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Share public links to let others view your chat and generated apps.
              Collaborators can see your code, comments, and iterations.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
