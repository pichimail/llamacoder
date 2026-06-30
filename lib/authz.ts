import "server-only";

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin-config";
import { auth, hasAuthSecret, isGoogleConfigured } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type AccessLevel = "viewer" | "editor" | "owner";

export type CurrentUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
};

export class AuthzError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  member: 1,
  editor: 2,
  admin: 3,
  owner: 3,
};

const REQUIRED_RANK: Record<AccessLevel, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function getCurrentUserOrNull(): Promise<CurrentUser | null> {
  try {
    const session = await auth();
    const rawUser = session?.user as any;
    if (!rawUser?.id) return null;
    const email = rawUser.email ? String(rawUser.email) : null;
    return {
      id: String(rawUser.id),
      email,
      isAdmin: rawUser.isAdmin === true || rawUser.role === "admin" || isAdminEmail(email),
    };
  } catch {
    // Never hard-fail downstream APIs because auth/session resolution failed.
    return null;
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUserOrNull();
  if (!user) {
    throw new AuthzError(401, "Unauthorized");
  }
  return user;
}

async function isAuthEnforced(): Promise<boolean> {
  // Production: always enforce for protected routes (secure default)
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  // Dev: respect explicit disable for local
  if (process.env.REQUIRE_GOOGLE_AUTH === "false") {
    return false;
  }
  const settings = await getSettings();
  const googleReady = isGoogleConfigured() && hasAuthSecret();
  return settings.saasMode === "on" && settings.googleAuth === "on" && googleReady;
}

function memberCan(role: string | null | undefined, level: AccessLevel): boolean {
  return (ROLE_RANK[String(role || "viewer").toLowerCase()] || 0) >= REQUIRED_RANK[level];
}

function canAccessProject(
  user: CurrentUser,
  project: { userId: string; members: Array<{ userId: string; role: string }> },
  level: AccessLevel,
): boolean {
  if (user.isAdmin) return true;
  if (project.userId === user.id) return true;
  const member = project.members.find((item) => item.userId === user.id);
  return memberCan(member?.role, level);
}

export async function requireProjectAccess(projectId: string, level: AccessLevel = "viewer") {
  const prisma = getPrisma();
  const user = await requireCurrentUser();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new AuthzError(404, "Project not found");
  if (!canAccessProject(user, project, level)) throw new AuthzError(403, "Forbidden");
  return { prisma, user, project };
}

export async function requireChatAccess(chatId: string, level: AccessLevel = "viewer") {
  const prisma = getPrisma();
  const user = await requireCurrentUser();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      project: {
        include: { members: true },
      },
    },
  });
  if (!chat) throw new AuthzError(404, "Chat not found");
  if (user.isAdmin) return { prisma, user, chat };
  if (!chat.project) throw new AuthzError(403, "Forbidden");
  if (!canAccessProject(user, chat.project, level)) throw new AuthzError(403, "Forbidden");
  return { prisma, user, chat };
}

export async function requireMessageAccess(messageId: string, level: AccessLevel = "viewer") {
  const prisma = getPrisma();
  const user = await requireCurrentUser();
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      chat: {
        include: {
          project: { include: { members: true } },
        },
      },
    },
  });
  if (!message) throw new AuthzError(404, "Message not found");
  const chat = message.chat;
  if (!chat) throw new AuthzError(404, "Chat not found");
  if (user.isAdmin) return { prisma, user, message, chat };
  if (!chat.project) throw new AuthzError(403, "Forbidden");
  if (!canAccessProject(user, chat.project, level)) throw new AuthzError(403, "Forbidden");
  return { prisma, user, message, chat };
}

export async function getScopedChatListWhere(options: { includeArchived?: boolean } = {}): Promise<Prisma.ChatWhereInput> {
  const enforced = await isAuthEnforced();
  const base: Prisma.ChatWhereInput = options.includeArchived ? {} : { isArchived: false };
  if (!enforced) return base;
  const user = await getCurrentUserOrNull();
  if (!user) return { ...base, id: "__no_access__" };
  if (user.isAdmin) return base;
  return {
    ...base,
    project: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
  };
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthzError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Access check failed" }, { status: 500 });
}

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    throw new AuthzError(403, "Admin access required");
  }
  return user;
}
