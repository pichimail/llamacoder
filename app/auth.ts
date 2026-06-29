import "server-only";

import { auth as nextAuthCore } from "@/lib/auth";

export type AppUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  role?: string | null
  isAdmin?: boolean
}

export type AppSession = {
  user: AppUser
} | null

/**
 * Get the current authenticated session.
 * Returns null if user is not authenticated.
 */
export async function auth(): Promise<AppSession> {
  const session = await nextAuthCore();
  if (!session) return null;

  return {
    user: {
      id: (session.user as any).id || "",
      email: session.user?.email ?? null,
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      role: (session.user as any).role ?? "user",
      isAdmin: (session.user as any).isAdmin ?? false,
    },
  };
}

/**
 * Get the current user or null if not authenticated.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth();
  return session?.user ?? null;
}
