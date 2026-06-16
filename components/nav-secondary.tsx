"use client"

import type { ComponentPropsWithoutRef, ReactNode } from "react"
import Link from "next/link"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function NavLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} aria-label={label} title={label}>
      {children}
    </Link>
  )
}

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
} & ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="flex-row gap-0.5 px-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className="w-auto">
              <SidebarMenuButton
                asChild
                size="sm"
                tooltip={item.title}
                className="size-7 w-7 justify-center p-0 [&>svg]:!size-3"
              >
                <NavLink href={item.url} label={item.title}>
                  <item.icon />
                  <span className="sr-only">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}