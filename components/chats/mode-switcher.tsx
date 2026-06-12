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
}> = [
  {
    id: 'preview',
    label: 'Preview',
    icon: Eye,
    description: 'See your app in action',
  },
  {
    id: 'code',
    label: 'Code',
    icon: Code,
    description: 'Edit files and components',
  },
  {
    id: 'design',
    label: 'Design',
    icon: Palette,
    description: 'Customize theme and components',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    description: 'Inspect schema and relationships',
  },
]

interface ModeSwitcherProps {
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
}

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id

          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onModeChange(mode.id)}
                  className="h-8 px-2"
                >
                  <Icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{mode.description}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
