"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  Settings, 
  BarChart3, 
  Shield, 
  Brain 
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/projects", label: "Projects", icon: FolderOpen },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/braintrust", label: "Braintrust Logs", icon: Brain },
  ];

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Admin Sidebar - separate from main */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <span className="font-semibold text-lg">Admin</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Chinna-Coder Console</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t mt-auto">
          <Link 
            href="/" 
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Admin Content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b px-6 py-3 flex items-center justify-between bg-background">
          <div className="text-sm font-medium text-muted-foreground">
            {pathname === "/admin" && "Overview"}
            {pathname.includes("users") && "User Management"}
            {pathname.includes("projects") && "Projects"}
            {pathname.includes("settings") && "Settings"}
            {pathname.includes("analytics") && "Analytics"}
            {pathname.includes("braintrust") && "Braintrust Logs"}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-xs text-muted-foreground">
              Admin Mode
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
