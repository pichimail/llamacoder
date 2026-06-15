'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Lock, Globe, Check } from 'lucide-react'

interface SharePanelProps {
  chatId: string
  title: string
}

export function SharePanel({ chatId, title }: SharePanelProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [visibility, setVisibility] = useState<'private' | 'link' | 'public'>('private')
  const [collaborators] = useState([
    { email: 'you@example.com', name: 'You', role: 'Owner' },
  ])

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/chats/${chatId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col bg-muted">
      <div className="h-10 border-b border-border px-4 flex items-center">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Share
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Visibility */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Visibility</Label>
            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Link only
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Public
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Link */}
          {visibility !== 'private' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Share Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="px-3"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Collaborators */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">People with access</Label>
            </div>

            <div className="space-y-2">
              {collaborators.map((collab, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-background border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">{collab.name}</p>
                    <p className="text-xs text-muted-foreground">{collab.email}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {collab.role}
                  </span>
                </div>
              ))}
            </div>

            {visibility !== 'private' && (
              <div className="pt-2">
                <Input
                  placeholder="Add email address"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          {/* Help */}
          <div className="p-3 rounded bg-background border border-border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">How does sharing work?</p>
            <p>
              {visibility === 'private'
                ? 'Only you can access this chat.'
                : visibility === 'link'
                  ? 'Anyone with the link can view and edit.'
                  : 'This chat is publicly visible.'}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
