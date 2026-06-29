"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Brain,
  Clock,
  Folder,
  GalleryVerticalEnd,
  Home,
  Images,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

import AuthButton from "@/components/auth-button";
import ThemeToggle from "@/components/theme-toggle";
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data";
import { cn } from "@/lib/utils";

function SidebarLink({ href, icon: Icon, label, active, collapsed, onClick }: { href: string; icon: ComponentType<{ className?: string }>; label: string; active?: boolean; collapsed?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group flex h-9 items-center rounded-xl text-sm text-zinc-200 transition hover:bg-zinc-800/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        active && "bg-zinc-800 text-white",
      )}
    >
      <Icon className="size-4 shrink-0 stroke-[1.9]" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function ChatListLink({ href, label, active, onClick }: { href: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block truncate rounded-xl px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800/90",
        active && "bg-zinc-800 text-white",
      )}
    >
      {label}
    </Link>
  );
}

function UserDock({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("border-t border-zinc-800 p-3", collapsed ? "flex flex-col items-center gap-2" : "space-y-2")}>
      <ThemeToggle
        showLabel={!collapsed}
        className={cn(
          "border-0 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white",
          collapsed ? "size-10 justify-center rounded-xl p-0" : "w-full justify-start rounded-xl px-3",
        )}
      />
      <div className={cn("bg-zinc-950", collapsed ? "flex justify-center" : "rounded-2xl p-2")}>
        <AuthButton />
      </div>
    </div>
  );
}

function GlobalSidebar({ collapsed, onToggle, onNavigate }: { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { chats, user, isAuthenticated } = useHomeSidebarData();
  const isAdmin = Boolean(user?.isAdmin && isAuthenticated);
  const recentChats = useMemo(() => chats.slice(0, 10), [chats]);

  return (
    <aside className={cn("flex h-full flex-col border-r border-zinc-800 bg-black text-white transition-[width] duration-200 ease-out", collapsed ? "w-[72px]" : "w-[320px]")}> 
      <div className="p-3">
        <div className={cn("group flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}> 
          <Link href="/" onClick={onNavigate} className={cn("flex items-center rounded-xl text-white transition hover:bg-zinc-900", collapsed ? "size-11 justify-center" : "min-w-0 gap-3 px-2 py-2")} aria-label="Chinna-Coder home">
            <GalleryVerticalEnd className="size-6 shrink-0" aria-hidden="true" />
            {!collapsed ? <span className="truncate text-2xl font-semibold tracking-tight">Chinna-Coder</span> : null}
          </Link>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-200 transition hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400",
                collapsed ? "absolute left-[14px] top-3 opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-100",
              )}
              aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
              title={collapsed ? "Open sidebar" : "Close sidebar"}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-3" : "px-3 pb-3")} aria-label="Primary navigation">
        <div className="space-y-1">
          <SidebarLink collapsed={collapsed} href="/" icon={Home} label="Home" active={pathname === "/"} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/" icon={Plus} label="New build" onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/chats" icon={Search} label="Search chats" active={pathname === "/chats"} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/gallery" icon={Images} label="Library" active={pathname.startsWith("/gallery")} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/chats" icon={Folder} label="Projects" active={pathname.startsWith("/chats")} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/settings" icon={Settings} label="Settings" active={pathname.startsWith("/settings")} onClick={onNavigate} />
          {!collapsed ? (
            <>
              <SidebarLink href="/#prompt-composer" icon={Sparkles} label="Prompt composer" onClick={onNavigate} />
              <SidebarLink href="/gallery?source=templates" icon={LayoutDashboard} label="Templates" onClick={onNavigate} />
              <SidebarLink href="/gallery?source=featured" icon={Shield} label="Featured" onClick={onNavigate} />
              <SidebarLink href="/settings#mcp" icon={MoreHorizontal} label="MCP servers" onClick={onNavigate} />
              <SidebarLink href="/settings#connectors" icon={Clock} label="Connectors" onClick={onNavigate} />
            </>
          ) : null}
          {isAdmin ? (
            <>
              <SidebarLink collapsed={collapsed} href="/admin" icon={Shield} label="Admin" active={pathname === "/admin"} onClick={onNavigate} />
              <SidebarLink collapsed={collapsed} href="/admin/braintrust" icon={Brain} label="Braintrust" active={pathname.startsWith("/admin/braintrust")} onClick={onNavigate} />
            </>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="mt-8 space-y-6">
            <section>
              <h2 className="px-4 pb-2 text-base font-semibold text-white">Pinned</h2>
              <div className="space-y-1">
                <ChatListLink href="/gallery?source=featured" label="Featured app templates" onClick={onNavigate} />
                <ChatListLink href="/settings" label="Generation settings" active={pathname.startsWith("/settings")} onClick={onNavigate} />
                <ChatListLink href="/admin/braintrust" label="Observability logs" onClick={onNavigate} />
              </div>
            </section>
            <section>
              <h2 className="px-4 pb-2 text-base font-semibold text-white">Recents</h2>
              <div className="space-y-1">
                {recentChats.length > 0 ? recentChats.map((chat) => (
                  <ChatListLink key={chat.id} href={`/chats/${chat.id}`} label={chat.title || "Untitled chat"} active={pathname === `/chats/${chat.id}`} onClick={onNavigate} />
                )) : <p className="px-4 py-2 text-sm text-zinc-500">No recent chats yet.</p>}
              </div>
            </section>
          </div>
        ) : null}
      </nav>

      <UserDock collapsed={collapsed} />
    </aside>
  );
}

export function GlobalAppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    // For admin routes, render children directly (admin layout provides its own sidebar)
    return <>{children}</>;
  }

  return (
    <div className={cn("min-h-dvh bg-background text-foreground transition-[grid-template-columns] duration-200 ease-out lg:grid", collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[320px_minmax(0,1fr)]")}>
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <GlobalSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>
      <div className="min-w-0">
        <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground" aria-label="Open navigation"><Menu className="size-4" aria-hidden="true" /></button>
          <Link href="/" className="text-sm font-semibold">Chinna-Coder</Link>
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        {children}
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(88vw,340px)] shadow-2xl">
            <div className="absolute right-3 top-3 z-10"><button type="button" onClick={() => setMobileOpen(false)} className="inline-flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white" aria-label="Close navigation"><X className="size-4" aria-hidden="true" /></button></div>
            <GlobalSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
