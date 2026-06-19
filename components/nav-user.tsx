"use client"

import Link from "next/link"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function NavUser({
  user,
  authEnabled = false,
  isAuthenticated = false,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  authEnabled?: boolean
  isAuthenticated?: boolean
}) {
  const { isMobile } = useSidebar()
  const initials = getInitials(user.name || "Guest")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-xl border border-white/8 bg-white/5 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white data-[state=open]:bg-white/8 data-[state=open]:text-white"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 stroke-[1.8]" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-2xl border border-white/8 bg-[#1F2023] text-[#F4F4F5] shadow-2xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {authEnabled ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem disabled>
                    <Sparkles className="stroke-[1.8]" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem disabled={!isAuthenticated}>
                    <BadgeCheck className="stroke-[1.8]" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!isAuthenticated}>
                    <CreditCard className="stroke-[1.8]" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!isAuthenticated}>
                    <Bell className="stroke-[1.8]" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <DropdownMenuItem asChild>
                    <a href="/api/auth/signout">
                      <LogOut className="stroke-[1.8]" />
                      Log out
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/api/auth/signin/google">
                      <LogIn className="stroke-[1.8]" />
                      Sign in with Google
                    </Link>
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/chats">
                      <BadgeCheck className="stroke-[1.8]" />
                      View chats
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/gallery">
                      <Sparkles className="stroke-[1.8]" />
                      Gallery
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
