import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/** Admin artifact (chat) moderation — list all user-generated artifacts with
 * search/filter, plus hide/unhide/delete actions. Every action is audit-logged
 * (Priority 3). */

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-artifacts:${admin.id}`, { limit: 60, windowSeconds: 60 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10) || 25, 1), 100);
    const search = searchParams.get("search")?.trim() || undefined;
    const status = searchParams.get("status") || "all"; // all | visible | hidden

    const prisma = getPrisma();
    const where = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { prompt: { contains: search, mode: "insensitive" as const } },
              { id: search },
            ],
          }
        : {}),
      ...(status === "hidden" ? { isHidden: true } : status === "visible" ? { isHidden: false } : {}),
    };

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          prompt: true,
          model: true,
          isHidden: true,
          isArchived: true,
          moderationNote: true,
          moderatedAt: true,
          createdAt: true,
          project: { select: { id: true, name: true, user: { select: { id: true, email: true, name: true } } } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.chat.count({ where }),
    ]);

    const rows = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      promptPreview: (chat.prompt || "").slice(0, 140),
      model: chat.model,
      isHidden: chat.isHidden,
      isArchived: chat.isArchived,
      moderationNote: chat.moderationNote,
      moderatedAt: chat.moderatedAt,
      createdAt: chat.createdAt,
      messageCount: chat._count.messages,
      owner: chat.project?.user
        ? { id: chat.project.user.id, email: chat.project.user.email, name: chat.project.user.name }
        : null,
      projectName: chat.project?.name ?? null,
    }));

    return NextResponse.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

const actionSchema = z.object({
  id: z.string().min(1).max(64),
  action: z.enum(["hide", "unhide", "delete"]),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-artifacts-action:${admin.id}`, { limit: 40, windowSeconds: 60 });

    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }
    const { id, action, note } = parsed.data;
    const prisma = getPrisma();

    const chat = await prisma.chat.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!chat) return NextResponse.json({ error: "Artifact not found" }, { status: 404 });

    if (action === "delete") {
      await prisma.chat.delete({ where: { id } });
      await logAudit({
        userId: admin.id,
        action: "admin.artifact.delete",
        resource: "chat",
        resourceId: id,
        metadata: { title: chat.title, note: note ?? null },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    const isHidden = action === "hide";
    await prisma.chat.update({
      where: { id },
      data: {
        isHidden,
        moderationNote: note ?? null,
        moderatedById: admin.id,
        moderatedAt: new Date(),
      },
    });
    await logAudit({
      userId: admin.id,
      action: isHidden ? "admin.artifact.hide" : "admin.artifact.unhide",
      resource: "chat",
      resourceId: id,
      metadata: { title: chat.title, note: note ?? null },
    });

    return NextResponse.json({ ok: true, isHidden });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
