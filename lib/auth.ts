import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";

// Real Google OAuth — works as soon as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
// (and AUTH_SECRET) are set in the environment. Sessions persist in Postgres.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getPrisma() as any),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "chinna-coder-dev-secret",
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) (session.user as any).id = user.id;
      return session;
    },
  },
}));

export function isGoogleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}
