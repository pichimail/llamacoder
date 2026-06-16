'use client'

import { useCallback, useEffect, useRef } from 'react'

import {
  INSPECTOR_MESSAGE_SOURCE,
  type InspectorInboundMessage,
  type InspectorOutboundMessage,
} from '@/lib/design-inspector'

interface DesignInspectorBridgeProps {
  enabled: boolean
  selectedElementId: string
  onSelectElement: (id: string) => void
  onHoverElement: (id: string | null) => void
  containerRef: React.RefObject<HTMLElement | null>
}

function broadcastToPreviewIframes(
  container: HTMLElement | null,
  message: InspectorInboundMessage,
) {
  if (!container) return

  const queue = Array.from(container.querySelectorAll('iframe'))
  const seen = new Set<HTMLIFrameElement>()

  while (queue.length > 0) {
    const iframe = queue.shift()
    if (!iframe || seen.has(iframe)) continue
    seen.add(iframe)

    try {
      iframe.contentWindow?.postMessage(message, '*')
    } catch {
      // Cross-origin iframes may throw on access; postMessage still works when allowed.
    }

    try {
      const nested = iframe.contentDocument?.querySelectorAll('iframe')
      if (nested?.length) queue.push(...Array.from(nested))
    } catch {
      // Nested cross-origin iframes cannot be traversed.
    }
  }
}

export function DesignInspectorBridge({
  enabled,
  selectedElementId,
  onSelectElement,
  onHoverElement,
  containerRef,
}: DesignInspectorBridgeProps) {
  const lastHoverRef = useRef<string | null>(null)

  const postToPreview = useCallback(
    (message: InspectorInboundMessage) => {
      broadcastToPreviewIframes(containerRef.current, message)
    },
    [containerRef],
  )

  useEffect(() => {
    postToPreview({ source: INSPECTOR_MESSAGE_SOURCE, type: 'set-enabled', enabled })
  }, [enabled, postToPreview])

  useEffect(() => {
    if (!enabled) {
      postToPreview({ source: INSPECTOR_MESSAGE_SOURCE, type: 'clear-highlight' })
      return
    }
    if (selectedElementId) {
      postToPreview({
        source: INSPECTOR_MESSAGE_SOURCE,
        type: 'highlight',
        id: selectedElementId,
      })
      return
    }
    postToPreview({ source: INSPECTOR_MESSAGE_SOURCE, type: 'clear-highlight' })
  }, [enabled, postToPreview, selectedElementId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as InspectorOutboundMessage | undefined
      if (!data || data.source !== INSPECTOR_MESSAGE_SOURCE) return

      if (data.type === 'hover') {
        const nextId = data.id || null
        if (lastHoverRef.current === nextId) return
        lastHoverRef.current = nextId
        onHoverElement(nextId)
        return
      }

      if (data.type === 'select' && data.id) {
        onSelectElement(data.id)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onHoverElement, onSelectElement])

  return null
}