"use client"

import * as React from "react"
import * as ResizablePackage from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePrimitive = ResizablePackage as unknown as {
  PanelGroup: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
  Panel: React.ComponentType<Record<string, unknown>>
  PanelResizeHandle: React.ComponentType<React.ComponentProps<"div"> & Record<string, unknown>>
}

type ResizablePanelGroupProps = React.ComponentProps<typeof ResizablePrimitive.PanelGroup>
type ResizableHandleProps = React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}

const ResizablePanelGroup = ({
  className,
  ...props
}: ResizablePanelGroupProps) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  className,
  ...props
}: ResizableHandleProps) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "group relative z-10 flex w-px shrink-0 items-center justify-center bg-border/70 outline-none transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-foreground/35 focus-visible:bg-ring data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:inset-y-auto data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
      className
    )}
    aria-label="Resize panel"
    {...props}
  />
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
