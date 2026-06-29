import "server-only";

import { auth, getCurrentUser, AppUser } from "@/app/auth";
import { getPrisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-config";

const REQUIRE_AUTH = process.env.REQUIRE_GOOGLE_AUTH !== "false";

/**
 * Get current user or throw 401 if not authenticated
 */
export async function requireCurrentUser(): Promise<AppUser> {
  if (!REQUIRE_AUTH) {
    // Dev mode without auth: return a mock user with id "local"
    return {
      id: "local",
      email: "local@dev.local",
      name: "Local Developer",
      role: "admin",
      isAdmin: true,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

/**
 * Get current user or null (non-throwing)
 */
export async function getCurrentUserOrNull(): Promise<AppUser | null> {
  if (!REQUIRE_AUTH) {
    return {
      id: "local",
      email: "local@dev.local",
      name: "Local Developer",
      role: "admin",
      isAdmin: true,
    };
  }
  return getCurrentUser();
}

/**
 * Require admin role or throw 403
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireCurrentUser();
  if (!user.isAdmin && !isAdminEmail(user.email)) {
    throw new AuthError("Forbidden: Admin role required", 403);
  }
  return user;
}

/**
 * Check if user can access a chat
 * @param chatId - Chat ID to check access for
 * @param userId - User ID (from session)
 * @param action - Type of action: 'read', 'write', 'delete'
 */
export async function requireChatAccess(
  chatId: string,
  userId: string,
  action: "read" | "write" | "delete" = "read"
): Promise<void> {
  const prisma = getPrisma();

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          id: true,
          userId: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!chat) {
    throw new AuthError("Chat not found", 404);
  }

  // If no project, this is a legacy local chat - allow only if user is owner
  if (!chat.projectId) {
    // In dev mode, allow access
    if (!REQUIRE_AUTH) return;

    // In prod, local chats should have been migrated to projects
    throw new AuthError("Chat not found", 404);
  }

  const project = chat.project;
  if (!project) {
    throw new AuthError("Chat not found", 404);
  }

  // Check if user is project owner
  if (project.userId === userId) {
    return;
  }

  // Check if user is a project member
  const member = project.members.find((m) => m.userId === userId);
  if (member) {
    // Validate action permissions based on role
    if (action === "delete" && member.role !== "owner") {
      throw new AuthError("Forbidden: Insufficient permissions", 403);
    }
    return;
  }

  // No access
  throw new AuthError("Forbidden: Cannot access this chat", 403);
}

/**
 * Check if user can access a project
 * @param projectId - Project ID to check access for
 * @param userId - User ID (from session)
 * @param action - Type of action: 'read', 'write', 'delete', 'manage'
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  action: "read" | "write" | "delete" | "manage" = "read"
): Promise<void> {
  const prisma = getPrisma();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      userId: true,
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  if (!project) {
    throw new AuthError("Project not found", 404);
  }

  // Check if user is project owner
  if (project.userId === userId) {
    return;
  }

  // Check if user is a project member
  const member = project.members.find((m) => m.userId === userId);
  if (member) {
    // Validate action permissions based on role
    if (action === "delete" && member.role !== "owner") {
      throw new AuthError("Forbidden: Insufficient permissions", 403);
    }
    if (action === "manage" && member.role !== "owner") {
      throw new AuthError("Forbidden: Insufficient permissions", 403);
    }
    return;
  }

  // No access
  throw new AuthError("Forbidden: Cannot access this project", 403);
}

/**
 * Check if user can access a message
 */
export async function requireMessageAccess(
  messageId: string,
  userId: string,
  action: "read" | "delete" = "read"
): Promise<void> {
  const prisma = getPrisma();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      chat: {
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              userId: true,
              members: {
                select: {
                  userId: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!message) {
    throw new AuthError("Message not found", 404);
  }

  const project = message.chat.project;
  if (!project) {
    // Legacy local message
    if (!REQUIRE_AUTH) return;
    throw new AuthError("Message not found", 404);
  }

  // Check if user is project owner
  if (project.userId === userId) {
    return;
  }

  // Check if user is a project member
  const member = project.members.find((m) => m.userId === userId);
  if (member) {
    if (action === "delete" && member.role !== "owner") {
      throw new AuthError("Forbidden: Insufficient permissions", 403);
    }
    return;
  }

  // No access
  throw new AuthError("Forbidden: Cannot access this message", 403);
}

/**
 * Check authentication status based on config
 * Throws 401 if auth is required but not provided
 */
export async function checkAuth(isRequired = REQUIRE_AUTH): Promise<AppUser | null> {
  if (!isRequired) {
    return getCurrentUserOrNull();
  }
  return requireCurrentUser();
}

/**
 * Custom Auth Error for consistent error handling
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Helper to convert AuthError to Response
 */
export function authErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      status: error.status,
    }),
    {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Helper for route handlers to check and return proper errors
 */
export async function withAuth<T>(
  handler: (user: AppUser) => Promise<T>,
  isRequired = REQUIRE_AUTH
): Promise<T | Response> {
  try {
    const user = await checkAuth(isRequired);
    if (!user && isRequired) {
      throw new AuthError("Unauthorized", 401);
    }
    if (user) {
      return handler(user);
    }
    throw new AuthError("Unauthorized", 401);
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    throw error;
  }
}
