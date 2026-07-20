"use client";

/** Admin layout (Phase 4): sectioned shadcn sidebar with mobile slide-over,
 * active left-border accents, and user avatar footer. */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FlaskConical,
  Images,
  LayoutDashboard,
  Menu,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Tags,
  ToggleLeft,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: Star },
      { href: "/admin/gallery", label: "Gallery Management", icon: Images },
      { href: "/admin/artifacts", label: "Artifact Moderation", icon: ShieldAlert },
    ],
  },
  {
    title: "AI Engine",
    items: [
      { href: "/admin/chinnallm", label: "ChinnaLLM Models", icon: Sparkles },
      { href: "/admin/chinnallm/usage", label: "Usage Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/admin/credits", label: "Credits Management", icon: CreditCard },
      { href: "/admin/pricing", label: "Pricing & Plans", icon: Tags },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/users", label: "User Management", icon: Users },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/flags", label: "Feature Flags", icon: ToggleLeft },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/analytics", label: "Analytics", icon: FlaskConical },
      { href: "/admin/braintrust", label: "Logs", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/chinnallm") return pathname === "/admin/chinnallm";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-300/50">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className={cn(
                    "h-9 w-full justify-start gap-2.5 rounded-xl border-l-2 border-transparent px-3 text-sm font-normal text-muted-foreground transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-100",
                    active &&
                      "border-emerald-400 bg-emerald-400/[0.08] font-medium text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]",
                  )}
                >
                  <Link href={item.href} onClick={onNavigate}>
                    <item.icon className={cn("size-4 shrink-0", active && "text-emerald-300")} />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { user } = useHomeSidebarData();
  return (
    <div className="shrink-0 border-t border-emerald-400/10 p-3">
      <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-emerald-400/[0.06]">
        <Avatar className="size-8 ring-1 ring-emerald-400/25">
          <AvatarImage src={(user as any)?.image ?? (user as any)?.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-emerald-400/10 text-xs text-emerald-200">{(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{user?.name || user?.email || "Admin"}</p>
          <Badge className="mt-0.5 rounded-full border-emerald-400/25 bg-emerald-400/10 px-2 py-0 text-[10px] text-emerald-200 hover:bg-emerald-400/10">
            <Shield className="mr-1 size-2.5" /> Admin
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarHeader = (
    <div className="flex items-center gap-2 border-b border-emerald-400/10 px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
          <Rocket className="size-4 text-emerald-300" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">Chinna-Coder</span>
      </Link>
      <Badge className="ml-auto rounded-full border-emerald-400/25 bg-emerald-400/10 px-2 py-0 text-[10px] text-emerald-200">Admin</Badge>
    </div>
  );

  return (
    <div className="emerald-glass-theme flex h-dvh overflow-hidden text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-emerald-400/10 bg-black/20 backdrop-blur-2xl md:flex">
        {sidebarHeader}
        <SidebarNav pathname={pathname} />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-emerald-400/10 bg-black/40 px-3 py-2 backdrop-blur-xl md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 text-emerald-200 hover:bg-emerald-400/10 hover:text-emerald-100" aria-label="Open admin menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex h-full w-72 flex-col gap-0 overflow-hidden border-emerald-400/10 bg-black/70 p-0 backdrop-blur-2xl">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              {sidebarHeader}
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold text-foreground">Admin</span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  );
}
