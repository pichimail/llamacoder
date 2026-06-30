import type { Session } from "next-auth";

import { auth } from "@/lib/auth";

export type AppUser = NonNullable<Session["user"]> & {
  id?: string;
  role?: string | null;
  isAdmin?: boolean;
};

export type AppSession = Session | null;

export { auth };
export { signIn, signOut } from "@/lib/auth";

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth();
  return (session?.user as AppUser | undefined) ?? null;
}
