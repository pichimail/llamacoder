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
import ThemeToggle from "@/components/theme-toggle";
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
      { href: "/admin/projects", label: "Featured Apps", icon: Star },
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
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
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
                    "h-9 w-full justify-start gap-2.5 rounded-lg border-l-2 border-transparent px-3 text-sm font-normal text-muted-foreground transition-colors",
                    active && "border-primary bg-muted/60 font-medium text-foreground",
                  )}
                >
                  <Link href={item.href} onClick={onNavigate}>
                    <item.icon className="size-4 shrink-0" />
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
    <div className="flex items-center gap-3 border-t border-border/60 p-3">
      <Avatar className="size-8">
        <AvatarImage src={(user as any)?.image ?? (user as any)?.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.name || user?.email || "Admin"}</p>
        <Badge variant="secondary" className="mt-0.5 rounded-full px-2 py-0 text-[10px]">
          <Shield className="mr-1 size-2.5" /> Admin
        </Badge>
      </div>
      <ThemeToggle />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarHeader = (
    <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        <Rocket className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Chinna-Coder</span>
      </Link>
      <Badge variant="outline" className="ml-auto rounded-full px-2 py-0 text-[10px]">Admin</Badge>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 md:flex">
        {sidebarHeader}
        <SidebarNav pathname={pathname} />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/85 px-3 py-2 backdrop-blur md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Open admin menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              {sidebarHeader}
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">Admin</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>

        <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  );
}
