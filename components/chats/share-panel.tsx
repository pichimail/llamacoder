'use client'

import { useMemo, useState } from 'react'
import { Copy, Globe, Lock } from 'lucide-react'

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

interface SharePanelProps {
  chatId: string
  onClose?: () => void
}

export function SharePanel({ chatId, onClose }: SharePanelProps) {
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/share/${chatId}`
    return `${window.location.origin}/share/${chatId}`
  }, [chatId])

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
      <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Share & Collaborate
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Close share panel"
          >
            ✕
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
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
                ? 'Only people with access can open this chat.'
                : 'Anyone with the link can view this chat.'}
            </p>
          </div>

          {visibility === 'public' && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="h-8 text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8 px-2"
                  aria-label="Copy share link"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-muted-foreground">Copied to clipboard.</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase">People with access</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <p className="text-xs font-medium">You</p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
                <span className="text-xs text-muted-foreground">Current user</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How sharing works</p>
            <p>Public links expose the current chat view. Collaboration controls still need backend persistence.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
