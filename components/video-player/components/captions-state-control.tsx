"use client"

import { ClosedCaptioningIcon } from "@phosphor-icons/react"

import { Button } from "@/components/button"
import { useCaptionsStore } from "@/components/hooks/use-captions"
import { CaptionsControl } from "@/components/ui/captions"

export function CaptionsStateControl() {
  const textTrackVisible = useCaptionsStore((state) => state.visible)

  return (
    <CaptionsControl asChild>
      <Button className="cursor-pointer" size="icon" variant="glass">
        <ClosedCaptioningIcon weight={textTrackVisible ? "fill" : "bold"} />
      </Button>
    </CaptionsControl>
  )
}
