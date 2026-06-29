"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Brain,
  ChevronDown,
  GalleryVerticalEnd,
  Home,
  Images,
  LayoutDashboard,
  Menu,
  MessageSquare,
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

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group flex h-10 items-center rounded-2xl text-sm text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40",
        collapsed ? "justify-center px-0" : "gap-2 px-3",
        active && "bg-white/10 text-white shadow-[0_12px_35px_rgba(0,0,0,0.18)]",
      )}
    >
      <Icon className="size-4 shrink-0 stroke-[1.8]" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function SidebarSection({
  title,
  children,
  collapsed,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  collapsed?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (collapsed) return <section className="space-y-1.5">{children}</section>;

  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-full items-center justify-between rounded-lg px-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown className={cn("size-3.5 transition", open ? "rotate-180" : "rotate-0")} aria-hidden="true" />
      </button>
      {open ? <div className="space-y-1">{children}</div> : null}
    </section>
  );
}

function GlobalSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { chats, user, authEnabled, isAuthenticated } = useHomeSidebarData();
  const isAdmin = Boolean(user?.isAdmin && isAuthenticated);
  const recentChats = useMemo(() => chats.slice(0, collapsed ? 3 : 5), [chats, collapsed]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#1F2023]/92 text-[#F4F4F5] shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-[width] duration-300 ease-out",
        collapsed ? "w-[64px]" : "w-[272px]",
      )}
    >
      <div className="border-b border-white/10 p-2.5">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
          <Link
            href="/"
            onClick={onNavigate}
            className={cn(
              "flex min-w-0 items-center rounded-2xl border border-white/10 bg-white/[0.055] transition hover:bg-white/10",
              collapsed ? "size-10 justify-center" : "flex-1 gap-3 p-2.5",
            )}
            aria-label="Chinna-Coder home"
            title="Chinna-Coder"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <GalleryVerticalEnd className="size-4" aria-hidden="true" />
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Chinna-Coder</span>
                <span className="block truncate text-xs text-zinc-400">Build at hyperspeed</span>
              </span>
            ) : null}
          </Link>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40",
                collapsed && "mt-2",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Link
          href="/"
          onClick={onNavigate}
          title={collapsed ? "New build" : undefined}
          className={cn(
            "mt-2 flex h-10 items-center rounded-2xl text-sm text-zinc-300 transition hover:-translate-y-px hover:bg-white/8 hover:text-white",
            collapsed ? "justify-center" : "gap-2 px-3",
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          {!collapsed ? "New build" : null}
        </Link>
      </div>

      <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        <SidebarSection title="Platform" collapsed={collapsed}>
          <SidebarLink collapsed={collapsed} href="/" icon={Home} label="Home" active={pathname === "/"} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/chats" icon={MessageSquare} label="All chats" active={pathname.startsWith("/chats")} onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/gallery" icon={Images} label="Gallery" active={pathname.startsWith("/gallery")} onClick={onNavigate} />
        </SidebarSection>

        <SidebarSection title="Build" collapsed={collapsed}>
          <SidebarLink collapsed={collapsed} href="/#prompt-composer" icon={Sparkles} label="Prompt composer" onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/gallery?source=templates" icon={LayoutDashboard} label="Templates" onClick={onNavigate} />
          <SidebarLink collapsed={collapsed} href="/gallery?source=featured" icon={Shield} label="Featured" onClick={onNavigate} />
        </SidebarSection>

        {isAdmin ? (
          <SidebarSection title="Admin" collapsed={collapsed}>
            <SidebarLink collapsed={collapsed} href="/admin" icon={Shield} label="Dashboard" active={pathname === "/admin"} onClick={onNavigate} />
            <SidebarLink collapsed={collapsed} href="/admin/braintrust" icon={Brain} label="Braintrust logs" active={pathname.startsWith("/admin/braintrust")} onClick={onNavigate} />
            <SidebarLink collapsed={collapsed} href="/admin#settings" icon={Settings} label="Feature flags" onClick={onNavigate} />
          </SidebarSection>
        ) : null}

        {!collapsed ? (
          <SidebarSection title="Recent chats" defaultOpen={recentChats.length > 0}>
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <SidebarLink key={chat.id} href={`/chats/${chat.id}`} icon={MessageSquare} label={chat.title || "Untitled chat"} active={pathname === `/chats/${chat.id}`} onClick={onNavigate} />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 px-3 py-3 text-xs leading-relaxed text-zinc-500">
                No recent chats yet. Start a new build from the prompt composer.
              </div>
            )}
          </SidebarSection>
        ) : null}
      </div>

      <div className={cn("border-t border-white/10 p-2.5", collapsed ? "space-y-2" : "space-y-2")}>
        <ThemeToggle
          showLabel={!collapsed}
          className={cn(
            "rounded-2xl border border-white/10 bg-white/[0.055] text-zinc-300 hover:bg-white/10 hover:text-white",
            collapsed ? "size-10 justify-center p-0" : "w-full justify-start",
          )}
        />
        <div className={cn("rounded-2xl border border-white/10 bg-white/[0.035]", collapsed ? "flex justify-center p-1" : "p-2")}>
          <AuthButton />
          {!collapsed && authEnabled && !isAuthenticated ? (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-zinc-500">Sign in to keep projects scoped to your account.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function GlobalAppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className={cn(
        "min-h-dvh bg-[radial-gradient(circle_at_50%_100%,rgba(255,122,0,0.16),transparent_36%),radial-gradient(circle_at_0%_0%,rgba(148,178,250,0.12),transparent_34%),hsl(var(--background))] text-foreground transition-[grid-template-columns] duration-300 ease-out lg:grid lg:p-2",
        collapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[296px_minmax(0,1fr)]",
      )}
    >
      <div className="hidden lg:sticky lg:top-2 lg:block lg:h-[calc(100dvh-1rem)]">
        <GlobalSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>
      <div className="min-w-0 lg:overflow-hidden lg:rounded-[28px] lg:shadow-[0_24px_90px_rgba(0,0,0,0.08)]">
        <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground" aria-label="Open navigation"><Menu className="size-4" aria-hidden="true" /></button>
          <Link href="/" className="text-sm font-semibold">Chinna-Coder</Link>
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        {children}
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(88vw,320px)] p-2 shadow-2xl">
            <div className="absolute right-5 top-5 z-10"><button type="button" onClick={() => setMobileOpen(false)} className="inline-flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white" aria-label="Close navigation"><X className="size-4" aria-hidden="true" /></button></div>
            <GlobalSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
