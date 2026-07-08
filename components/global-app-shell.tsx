"use client";

/** Global app shell (Phase 4 recreation): minimal, quiet sidebar.
 * Theme-aware surfaces, one link per destination, subtle active state,
 * recents list, and feature-flag-gated entries. Collapsible on desktop,
 * slide-over on mobile. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  CreditCard,
  BadgeDollarSign,
  Home,
  Images,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Settings,
  Shield,
  X,
} from "lucide-react";

import AuthButton from "@/components/auth-button";
import ThemeToggle from "@/components/theme-toggle";
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data";
import { CookieBanner } from "@/components/cookie-banner";
import { RichFooter } from "@/components/rich-footer";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { cn } from "@/lib/utils";

function SidebarLink({ href, icon: Icon, label, active, collapsed, onClick }: {
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
        "flex h-9 items-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        active && "bg-muted font-medium text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function GlobalSidebar({ collapsed, onToggle, onNavigate }: { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { chats, user, isAuthenticated } = useHomeSidebarData();
  const { isEnabled } = useFeatureFlags();
  const isAdmin = Boolean(user?.isAdmin && isAuthenticated);
  const recentChats = useMemo(() => chats.slice(0, 8), [chats]);

  return (
    <aside className={cn("flex h-dvh flex-col overflow-hidden border-r border-border/70 bg-card/30 transition-[width] duration-200 ease-out", collapsed ? "w-[68px]" : "w-[264px]")}>
      {/* Header */}
      <div className={cn("flex items-center p-3", collapsed ? "justify-center" : "justify-between gap-2")}>
        <Link href="/" onClick={onNavigate} className={cn("flex items-center rounded-lg transition-colors hover:bg-muted/70", collapsed ? "size-10 justify-center" : "min-w-0 gap-2 px-2 py-1.5")} aria-label="Chinna-Coder home">
          <Rocket className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {!collapsed ? <span className="truncate text-base font-semibold tracking-tight">Chinna-Coder</span> : null}
        </Link>
        {onToggle && !collapsed ? (
          <button type="button" onClick={onToggle} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground" aria-label="Collapse sidebar">
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {onToggle && collapsed ? (
        <div className="flex justify-center pb-1">
          <button type="button" onClick={onToggle} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground" aria-label="Expand sidebar">
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* New build */}
      <div className={cn("px-3 pb-2", collapsed && "flex justify-center")}>
        <Link
          href="/#prompt-composer"
          onClick={onNavigate}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border/80 bg-background text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/70",
            collapsed ? "size-10 px-0" : "w-full px-3",
          )}
          aria-label="New build"
          title={collapsed ? "New build" : undefined}
        >
          <Plus className="size-4" aria-hidden="true" />
          {!collapsed ? "New build" : null}
        </Link>
      </div>

      {/* Nav */}
      <nav className={cn("min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3", collapsed && "px-2.5")} aria-label="Primary navigation">
        <SidebarLink collapsed={collapsed} href="/" icon={Home} label="Home" active={pathname === "/"} onClick={onNavigate} />
        <SidebarLink collapsed={collapsed} href="/chats" icon={MessageSquare} label="Chats" active={pathname === "/chats" || (pathname.startsWith("/chats/") && collapsed)} onClick={onNavigate} />
        {isEnabled("gallery") ? (
          <SidebarLink collapsed={collapsed} href="/gallery" icon={Images} label="Gallery" active={pathname.startsWith("/gallery")} onClick={onNavigate} />
        ) : null}
        {isEnabled("credits-page") ? (
          <SidebarLink collapsed={collapsed} href="/credits" icon={CreditCard} label="Credits" active={pathname.startsWith("/credits")} onClick={onNavigate} />
        ) : null}
        <SidebarLink collapsed={collapsed} href="/pricing" icon={BadgeDollarSign} label="Pricing" active={pathname.startsWith("/pricing")} onClick={onNavigate} />
        <SidebarLink collapsed={collapsed} href="/settings" icon={Settings} label="Settings" active={pathname.startsWith("/settings")} onClick={onNavigate} />
        {isAdmin ? (
          <SidebarLink collapsed={collapsed} href="/admin" icon={Shield} label="Admin" active={pathname.startsWith("/admin")} onClick={onNavigate} />
        ) : null}

        {/* Recents */}
        {!collapsed ? (
          <div className="pt-5">
            <h2 className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Recents</h2>
            <div className="space-y-0.5">
              {recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chats/${chat.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "block truncate rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                      pathname === `/chats/${chat.id}` && "bg-muted text-foreground",
                    )}
                  >
                    {chat.title || "Untitled chat"}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-1.5 text-xs text-muted-foreground/70">No recent chats yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-border/70 p-3", collapsed ? "flex flex-col items-center gap-2" : "space-y-2")}>
        <ThemeToggle
          showLabel={!collapsed}
          className={cn(
            "border border-border/80 bg-background/90 text-foreground shadow-sm hover:bg-muted/80 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16]",
            collapsed ? "size-9 justify-center rounded-lg p-0" : "w-full justify-start rounded-lg px-3",
          )}
        />
        <div className={cn(collapsed ? "flex justify-center" : "rounded-lg")}>
          <AuthButton />
        </div>
      </div>
    </aside>
  );
}

export function GlobalAppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [immersiveFullscreen, setImmersiveFullscreen] = useState(false);
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  const { isAuthenticated: isAuthedGlobal, authEnabled: authOnGlobal } = useHomeSidebarData();
  const showSidebar = !immersiveFullscreen && !isAdminRoute && (!authOnGlobal || isAuthedGlobal);

  useEffect(() => {
    const onChange = (event: Event) => {
      setImmersiveFullscreen(Boolean((event as CustomEvent<{ active: boolean }>).detail?.active));
    };
    window.addEventListener("hs-immersive-fullscreen", onChange);
    return () => window.removeEventListener("hs-immersive-fullscreen", onChange);
  }, []);

  if (isAdminRoute) {
    // Admin routes render their own layout + sidebar.
    return <>{children}</>;
  }

  // IMPORTANT: `children` must stay at the same structural depth/position in
  // both branches below. Early-returning a differently-shaped tree (e.g. bare
  // `{children}` vs. children nested inside the grid wrapper) makes React
  // treat it as a different subtree and remount it — which would silently
  // wipe all of the chats page's local state (including the very
  // immersiveFullscreen toggle that triggered this) a moment after switching.
  // So immersive mode only hides the sidebar/mobile-bar siblings, it never
  // changes where `children` sits in the tree.
  return (
    <div className={cn("h-dvh overflow-hidden bg-background text-foreground transition-[grid-template-columns] duration-200 ease-out", showSidebar && "lg:grid", showSidebar && (collapsed ? "lg:grid-cols-[68px_minmax(0,1fr)]" : "lg:grid-cols-[264px_minmax(0,1fr)]"))}>
      {showSidebar && (
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-hidden">
          <GlobalSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {showSidebar && !immersiveFullscreen && (
          <div className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-3 backdrop-blur lg:hidden">
            <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground" aria-label="Open navigation">
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <Link href="/" className="text-sm font-semibold">Chinna-Coder</Link>
            <span className="size-9" aria-hidden="true" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
      {showSidebar && mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(85vw,300px)] bg-background shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground" aria-label="Close navigation">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <GlobalSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
      {children}
      <RichFooter />
      <CookieBanner />
    </div>
  );
}
