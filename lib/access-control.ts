import "server-only";

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin-config";
import { auth, isGoogleConfigured } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type AccessLevel = "viewer" | "editor" | "owner";

export type CurrentUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
};

export class AccessControlError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AccessControlError";
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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const rawUser = session?.user as any;
  if (!rawUser?.id) return null;

  const email = rawUser.email ? String(rawUser.email) : null;
  return {
    id: String(rawUser.id),
    email,
    isAdmin: rawUser.isAdmin === true || rawUser.role === "admin" || isAdminEmail(email),
  };
}

export async function isAuthRequired() {
  const settings = await getSettings();
  return settings.saasMode === "on" && settings.googleAuth === "on" && isGoogleConfigured();
}

function memberCan(role: string | null | undefined, level: AccessLevel) {
  return (ROLE_RANK[String(role || "viewer").toLowerCase()] || 0) >= REQUIRED_RANK[level];
}

function canAccessProject(
  user: CurrentUser | null,
  project: { userId: string; members: Array<{ userId: string; role: string }> },
  level: AccessLevel,
) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (project.userId === user.id) return true;

  const member = project.members.find((item) => item.userId === user.id);
  return memberCan(member?.role, level);
}

export async function requireProjectAccess(projectId: string, level: AccessLevel = "viewer") {
  const prisma = getPrisma();
  const [authNeeded, user] = await Promise.all([isAuthRequired(), getCurrentUser()]);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new AccessControlError(404, "Project not found");
  if (!authNeeded) return { prisma, user, project };
  if (!user) throw new AccessControlError(401, "Unauthorized");
  if (!canAccessProject(user, project, level)) throw new AccessControlError(403, "Forbidden");

  return { prisma, user, project };
}

export async function requireChatAccess(chatId: string, level: AccessLevel = "viewer") {
  const prisma = getPrisma();
  const [authNeeded, user] = await Promise.all([isAuthRequired(), getCurrentUser()]);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      project: {
        include: { members: true },
      },
    },
  });

  if (!chat) throw new AccessControlError(404, "Chat not found");
  if (!authNeeded) return { prisma, user, chat };
  if (!user) throw new AccessControlError(401, "Unauthorized");
  if (user.isAdmin) return { prisma, user, chat };
  if (!chat.project) throw new AccessControlError(403, "Forbidden");
  if (!canAccessProject(user, chat.project, level)) throw new AccessControlError(403, "Forbidden");

  return { prisma, user, chat };
}

export async function getScopedChatListWhere(options: { includeArchived?: boolean } = {}): Promise<Prisma.ChatWhereInput> {
  const [authNeeded, user] = await Promise.all([isAuthRequired(), getCurrentUser()]);
  const base: Prisma.ChatWhereInput = options.includeArchived ? {} : { isArchived: false };

  if (!authNeeded) return base;
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

export function accessErrorResponse(error: unknown) {
  if (error instanceof AccessControlError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Access check failed" }, { status: 500 });
}
