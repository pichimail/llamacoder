"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePackage from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePrimitive = ResizablePackage as unknown as {
  Group?: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
  PanelGroup?: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
  Panel: React.ComponentType<Record<string, unknown>>
  Separator?: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
  PanelResizeHandle?: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
}

const PanelGroup = ResizablePrimitive.PanelGroup ?? ResizablePrimitive.Group!
const PanelResizeHandle = ResizablePrimitive.PanelResizeHandle ?? ResizablePrimitive.Separator!

type ResizablePanelGroupProps = React.ComponentProps<typeof PanelGroup>
type ResizableHandleProps = React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
}

const ResizablePanelGroup = ({
  className,
  ...props
}: ResizablePanelGroupProps) => (
  <PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) => (
  <PanelResizeHandle
    className={cn(
      "group relative z-10 flex w-px shrink-0 items-center justify-center bg-fuchsia-500/12 outline-none transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-violet-400/25 focus-visible:bg-ring data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:inset-y-auto data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    aria-label="Resize panel"
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-fuchsia-400/30 bg-zinc-950 shadow-[0_0_12px_rgba(244,114,182,0.2)]">
        <GripVertical className="size-2.5 text-amber-300" aria-hidden="true" />
      </div>
    ) : null}
  </PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
