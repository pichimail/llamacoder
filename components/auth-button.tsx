"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GalleryVerticalEnd, LogIn, LogOut, Shield, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

async function fetchJsonWithTimeout(url: string, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function initials(name?: string | null, email?: string | null) {
  const base = name || email || "User";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AuthButton() {
  const [enabled, setEnabled] = useState(false);
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    image?: string;
    isAdmin?: boolean;
    role?: string;
  } | null>(null);

  useEffect(() => {
    fetchJsonWithTimeout("/api/public-settings")
      .then((d) => {
        if (d?.saasMode && d?.googleAuth) {
          setEnabled(true);
          return fetchJsonWithTimeout("/api/auth/session")
            .then((s) => setUser(s?.user ?? null));
        }
      })
      .catch(() => {});
  }, []);

  if (!enabled) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-3 text-xs font-medium text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <LogIn className="size-3.5" aria-hidden="true" />
        Sign in with Google
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full ring-1 ring-border transition hover:ring-foreground/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Open account menu"
        >
          <Avatar className="size-9">
            <AvatarImage src={user.image || ""} alt={user.name || user.email || "Account"} />
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={user.image || ""} alt={user.name || user.email || "Account"} />
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name || "Account"}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/chats">
            <GalleryVerticalEnd className="size-4" />
            Projects
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/gallery">
            <UserRound className="size-4" />
            Gallery
          </Link>
        </DropdownMenuItem>
        {user.isAdmin || user.role === "admin" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="size-4" />
                Admin dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/braintrust">
                <Shield className="size-4" />
                Braintrust logs
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/auth/signout">
            <LogOut className="size-4" />
            Log out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
