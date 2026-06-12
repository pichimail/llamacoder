'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PreviewModeProps {
  chatId: string
  projectId?: string
}

export function PreviewMode({ chatId, projectId }: PreviewModeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    // Refresh iframe
    const iframe = document.getElementById(
      `preview-${chatId}`
    ) as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full h-full flex flex-col bg-muted">
      {/* Preview Toolbar */}
      <div className="h-10 border-b border-border bg-background flex items-center px-4 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          {loading ? 'Loading preview...' : 'Preview ready'}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden relative bg-white">
        {error && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="inline-block">
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}

        <iframe
          id={`preview-${chatId}`}
          src={`/api/preview/${chatId}`}
          title="Preview"
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  )
}
