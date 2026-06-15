"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type OptionDropdownItem = {
  value: string
  label: ReactNode
}

type OptionDropdownProps = {
  value: string
  onValueChange: (value: string) => void
  options: OptionDropdownItem[]
  triggerLabel?: ReactNode
  triggerClassName?: string
  contentClassName?: string
  align?: "start" | "center" | "end"
  disabled?: boolean
  showChevron?: boolean
  tip?: string
  "aria-label"?: string
}

export function OptionDropdown({
  value,
  onValueChange,
  options,
  triggerLabel,
  triggerClassName,
  contentClassName,
  align = "start",
  disabled,
  showChevron = true,
  tip,
  "aria-label": ariaLabel,
}: OptionDropdownProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel ?? tip}
          title={tip}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            triggerClassName,
          )}
        >
          {triggerLabel ?? selected?.label ?? value}
          {showChevron ? (
            <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("z-[999] min-w-[8rem]", contentClassName)}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}