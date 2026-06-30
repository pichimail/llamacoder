import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-config";

export function isGoogleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function hasAuthSecret() {
  return !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
}

let warnedMissingSecret = false;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production" && !warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn("AUTH_SECRET is missing in production. Falling back to a temporary secret. Set AUTH_SECRET in deployment environment.");
  }
  return secret || "chinna-coder-fallback-secret-change-me";
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
