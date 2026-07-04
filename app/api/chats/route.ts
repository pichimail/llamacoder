import { NextResponse } from "next/server";

import { getScopedChatListWhere } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = getPrisma();
    const where = await getScopedChatListWhere({ includeArchived: true });

    const chats = await prisma.chat.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        prompt: true,
        isPinned: true,
        isArchived: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    const pinned = chats.filter((chat) => chat.isPinned);
    const recent = chats.filter((chat) => !chat.isPinned && !chat.isArchived).slice(0, 20);
    const serialize = (chat: (typeof chats)[number]) => ({
      id: chat.id,
      title: chat.title,
      prompt: chat.prompt,
      isPinned: chat.isPinned,
      isArchived: chat.isArchived,
      projectId: chat.projectId,
      projectName: chat.project?.name ?? null,
      createdAt: chat.createdAt.toISOString(),
    });

    return NextResponse.json({
      pinned: pinned.map(serialize),
      recent: recent.map(serialize),
      all: chats.map(serialize),
    });
  } catch (error) {
    console.error("Error loading chats:", error);
    return NextResponse.json({
      pinned: [],
      recent: [],
      all: [],
      warning: "Chat history is temporarily unavailable",
    });
  }
}
