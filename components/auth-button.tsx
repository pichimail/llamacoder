"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";

// Shows Google sign-in ONLY when SaaS mode is toggled on in /admin
// (and GOOGLE_CLIENT_ID/SECRET are configured). Otherwise renders nothing —
// the app stays in open free mode.
export default function AuthButton() {
  const [enabled, setEnabled] = useState(false);
  const [user, setUser] = useState<{ name?: string; image?: string } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.saasMode && d?.googleAuth) {
          setEnabled(true);
          return fetch("/api/auth/session", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((s) => setUser(s?.user ?? null));
        }
      })
      .catch(() => {});
  }, []);

  if (!enabled) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name || "Account"}
            className="size-7 rounded-full ring-1 ring-border"
          />
        ) : (
          <span className="text-xs text-muted-foreground">{user.name}</span>
        )}
        <a
          href="/api/auth/signout"
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/signin/google"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-foreground transition hover:bg-accent"
    >
      <LogIn className="size-3.5" aria-hidden="true" />
      Sign in with Google
    </a>
  );
}
