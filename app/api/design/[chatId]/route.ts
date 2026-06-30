import { NextRequest, NextResponse } from "next/server";
import { requireChatAccess } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    const { prisma } = await requireChatAccess(chatId, "viewer");
    const files = await prisma.projectFile.findMany({
      where: { project: { chats: { some: { id: chatId } } } },
      orderBy: { path: "asc" },
    });
    const checkpoints = await prisma.designCheckpoint.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      files: files.map((f) => ({ path: f.path, content: f.content })),
      checkpoints: checkpoints.map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Forbidden" }, { status: e?.status || 403 });
  }
}
