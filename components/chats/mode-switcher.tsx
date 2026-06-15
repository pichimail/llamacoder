'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Eye, Code, Palette, Database } from 'lucide-react'

export type ChatMode = 'preview' | 'code' | 'design' | 'database'

const modes: Array<{
  id: ChatMode
  label: string
  icon: typeof Eye
  description: string
  shortcut: string
}> = [
  {
    id: 'preview',
    label: 'Preview',
    icon: Eye,
    description: 'See the current artifact live',
    shortcut: 'Alt+1',
  },
  {
    id: 'code',
    label: 'Code',
    icon: Code,
    description: 'Edit the current artifact files',
    shortcut: 'Alt+2',
  },
  {
    id: 'design',
    label: 'Design',
    icon: Palette,
    description: 'Inspect and tune the current artifact',
    shortcut: 'Alt+3',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    description: 'Inspect schema files from this artifact',
    shortcut: 'Alt+4',
  },
]

interface ModeSwitcherProps {
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  compact?: boolean
}

export function ModeSwitcher({ currentMode, onModeChange, compact }: ModeSwitcherProps) {
  return (
    <TooltipProvider>
      <div
        className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-border bg-background p-0.5"
        role="tablist"
        aria-label="Workspace mode"
      >
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id

          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <Button
                  role="tab"
                  aria-selected={isActive}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onModeChange(mode.id)}
                  className={compact ? 'h-8 flex-1 px-2 text-xs' : 'h-8 px-2 text-xs'}
                >
                  <Icon className="h-4 w-4" />
                  <span className={compact ? 'ml-1 hidden sm:inline' : 'ml-1.5 hidden lg:inline'}>
                    {mode.label}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-0.5">
                  <p>{mode.description}</p>
                  <p className="text-[10px] text-muted-foreground">{mode.shortcut}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
