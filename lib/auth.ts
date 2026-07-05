import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-config";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { ensureUserCredits } from "@/lib/chinnallm/credits";

export function isGoogleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function hasAuthSecret() {
  return !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
}

function getAuthSecret() {
  return resolveAuthSecret();
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getPrisma() as any),
  session: { strategy: "database" },
  secret: getAuthSecret(),
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: isGoogleConfigured()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
      ]
    : [],
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureUserCredits(user.id).catch((error) => console.warn("Could not grant initial ChinnaLLM credits", error));
      }
    },
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        const email = session.user.email || user.email || null;
        (session.user as any).id = user.id;
        (session.user as any).role = isAdminEmail(email) ? "admin" : "user";
        (session.user as any).isAdmin = isAdminEmail(email);
      }
      return session;
    },
  },
}));
