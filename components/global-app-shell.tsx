"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  onClick,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40",
        active && "bg-white/10 text-white shadow-sm",
      )}
    >
      <Icon className="size-4 shrink-0 stroke-[1.8]" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

function GlobalSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { chats, user, authEnabled, isAuthenticated } = useHomeSidebarData();
  const isAdmin = Boolean(user?.isAdmin && isAuthenticated);
  const recentChats = useMemo(() => chats.slice(0, 5), [chats]);

  return (
    <aside className="flex h-full w-[272px] flex-col border-r border-white/10 bg-[#1F2023] text-[#F4F4F5]">
      <div className="border-b border-white/10 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
            <GalleryVerticalEnd className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Chinna-Coder</span>
            <span className="block truncate text-xs text-zinc-400">Build at hyperspeed</span>
          </span>
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="mt-2 flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          New build
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <SidebarSection title="Platform">
          <SidebarLink href="/" icon={Home} label="Home" active={pathname === "/"} onClick={onNavigate} />
          <SidebarLink href="/chats" icon={MessageSquare} label="All chats" active={pathname.startsWith("/chats")} onClick={onNavigate} />
          <SidebarLink href="/gallery" icon={Images} label="Gallery" active={pathname.startsWith("/gallery")} onClick={onNavigate} />
        </SidebarSection>

        <SidebarSection title="Build">
          <SidebarLink href="/#prompt-composer" icon={Sparkles} label="Prompt composer" onClick={onNavigate} />
          <SidebarLink href="/gallery?source=templates" icon={LayoutDashboard} label="Templates" onClick={onNavigate} />
          <SidebarLink href="/gallery?source=featured" icon={Shield} label="Featured" onClick={onNavigate} />
        </SidebarSection>

        {isAdmin ? (
          <SidebarSection title="Admin">
            <SidebarLink href="/admin" icon={Shield} label="Dashboard" active={pathname === "/admin"} onClick={onNavigate} />
            <SidebarLink href="/admin/braintrust" icon={Brain} label="Braintrust logs" active={pathname.startsWith("/admin/braintrust")} onClick={onNavigate} />
            <SidebarLink href="/admin#settings" icon={Settings} label="Feature flags" onClick={onNavigate} />
          </SidebarSection>
        ) : null}

        <SidebarSection title="Recent chats" defaultOpen={recentChats.length > 0}>
          {recentChats.length > 0 ? (
            recentChats.map((chat) => (
              <SidebarLink
                key={chat.id}
                href={`/chats/${chat.id}`}
                icon={MessageSquare}
                label={chat.title || "Untitled chat"}
                active={pathname === `/chats/${chat.id}`}
                onClick={onNavigate}
              />
            ))
          ) : (
            <div className="rounded-xl border border-white/10 px-3 py-3 text-xs leading-relaxed text-zinc-500">
              No recent chats yet. Start a new build from the prompt composer.
            </div>
          )}
        </SidebarSection>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2">
          <ThemeToggle showLabel className="w-full justify-start rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <AuthButton />
          {authEnabled && !isAuthenticated ? (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-zinc-500">Sign in to keep projects scoped to your account.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function GlobalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isFullscreenPreview = pathname.startsWith("/chats/") && searchParams.get("fs") === "1";

  if (isFullscreenPreview) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <div className="hidden lg:block lg:h-dvh lg:sticky lg:top-0">
        <GlobalSidebar />
      </div>

      <div className="min-w-0">
        <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
          <Link href="/" className="text-sm font-semibold">Chinna-Coder</Link>
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        {children}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white"
                aria-label="Close navigation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <GlobalSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
