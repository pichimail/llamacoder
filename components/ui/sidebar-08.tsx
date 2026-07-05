"use client";

/**
 * sidebar-08 block — the shadcn "collapsible icon rail + inset content"
 * layout, composed locally from the installed sidebar primitives.
 *
 * The `npx shadcn@latest add sidebar-08` CLI command cannot run inside a chat,
 * so this file provides the same composition the block would have scaffolded.
 * Drop `<Sidebar08 items={...} user={...}>{children}</Sidebar08>` around any
 * page (e.g. the admin shell) to get the collapsible-icon layout.
 */
import * as React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export type Sidebar08SubItem = { title: string; href: string };
export type Sidebar08Item = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  items?: Sidebar08SubItem[];
};
export type Sidebar08Group = { label?: string; items: Sidebar08Item[] };
export type Sidebar08User = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type Sidebar08Props = {
  groups: Sidebar08Group[];
  user?: Sidebar08User;
  brand?: React.ReactNode;
  /** Optional breadcrumb / header content rendered in the inset top bar. */
  header?: React.ReactNode;
  onSignOut?: () => void;
  children: React.ReactNode;
};

function NavItem({ item }: { item: Sidebar08Item }) {
  const Icon = item.icon;
  if (item.items && item.items.length > 0) {
    return (
      <Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
              {Icon ? <Icon className="size-4" /> : null}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((sub) => (
                <SidebarMenuSubItem key={sub.title}>
                  <SidebarMenuSubButton asChild>
                    <Link href={sub.href}>
                      <span>{sub.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
        <Link href={item.href ?? "#"}>
          {Icon ? <Icon className="size-4" /> : null}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar08({
  groups,
  user,
  brand,
  header,
  onSignOut,
  children,
}: Sidebar08Props) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:!p-2">
                {brand ?? <span className="truncate font-semibold">Console</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((group, gi) => (
            <SidebarGroup key={group.label ?? gi}>
              {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {user ? (
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar className="size-8 rounded-lg">
                        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                        <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user.name}</span>
                        {user.email ? (
                          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        ) : null}
                      </div>
                      <MoreHorizontal className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8 rounded-lg">
                          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                          <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{user.name}</span>
                          {user.email ? (
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                          ) : null}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    {onSignOut ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        ) : null}
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {header}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Sidebar08;
