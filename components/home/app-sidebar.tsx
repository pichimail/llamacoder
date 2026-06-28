"use client"

import Link from "next/link"
import {
  GalleryVerticalEnd,
  Home,
  Images,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavRecentChats } from "@/components/home/nav-recent-chats"
import ThemeToggle from "@/components/theme-toggle"
import type { HomeSidebarChat, HomeSidebarUser } from "@/components/home/use-home-sidebar-data"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

function getNavMain(isAdmin?: boolean) {
  return [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
      items: [
        { title: "New build", url: "/" },
        { title: "All chats", url: "/chats" },
      ],
    },
    {
      title: "Build",
      url: "#prompt-composer",
      icon: Sparkles,
      items: [
        { title: "Prompt composer", url: "#prompt-composer" },
        { title: "Examples", url: "#examples" },
      ],
    },
    {
      title: "Discover",
      url: "/gallery",
      icon: Images,
      items: [{ title: "Gallery", url: "/gallery" }],
    },
    ...(isAdmin
      ? [
          {
            title: "Admin",
            url: "/admin",
            icon: Shield,
            items: [
              { title: "Overview", url: "/admin" },
              { title: "Braintrust logs", url: "/admin/braintrust" },
              { title: "Deployment", url: "/admin" },
            ],
          },
        ]
      : []),
  ]
}

export function HomeAppSidebar({
  chats,
  user,
  authEnabled,
  isAuthenticated,
  loading,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  chats: HomeSidebarChat[]
  user: HomeSidebarUser
  authEnabled: boolean
  isAuthenticated: boolean
  loading?: boolean
}) {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="bg-[#1F2023] text-[#F4F4F5]"
      {...props}
    >
      <SidebarRail />
      <SidebarHeader className="gap-3 border-b border-white/8 bg-[#1F2023]/95 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="rounded-xl border border-white/8 bg-white/5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white data-[active=true]:bg-white/8"
            >
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm">
                  <GalleryVerticalEnd className="size-4 stroke-[1.8]" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Chinna-Coder</span>
                  <span className="truncate text-xs">Build at hyperspeed</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="New Chat" className="rounded-xl transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white">
              <Link href="/">
                <Plus className="stroke-[1.8]" />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-[#1F2023] px-0 py-2">
        <NavMain items={getNavMain(user.isAdmin)} />
        <NavRecentChats chats={chats} loading={loading} />
      </SidebarContent>
      <SidebarFooter className="border-t border-white/8 bg-[#1F2023]/95">
        <div className="px-2">
          <ThemeToggle showLabel className="w-full justify-start rounded-xl border border-white/8 bg-white/5 text-[#F4F4F5]/80 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white" />
        </div>
        <SidebarSeparator />
        {authEnabled && !isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="bg-sidebar-accent/40">
                <Link href="/login">
                  <MessageSquare />
                  <span>Sign in with Google</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <NavUser
            user={user}
            authEnabled={authEnabled}
            isAuthenticated={isAuthenticated}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
