import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireChatAccess } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const schema = z.object({ name: z.string().max(100).optional() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  try {
    await requireChatAccess(chatId, "viewer");
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prisma = getPrisma();
  const checkpoints = await prisma.designCheckpoint.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
    take: 20,
  });
  return NextResponse.json({ checkpoints });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  let access;
  try {
    access = await requireChatAccess(chatId, "editor");
  } catch (e: any) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const p = schema.safeParse(body);
  const name = p.success ? (p.data.name || "checkpoint") : "checkpoint";

  const prisma = getPrisma();
  const proj = await prisma.project.findFirst({ where: { chats: { some: { id: chatId } } } });
  if (!proj) return NextResponse.json({ error: "No project" }, { status: 404 });

  const files = await prisma.projectFile.findMany({ where: { projectId: proj.id } });
  const snapshot = { files: files.map(f => ({ path: f.path, content: f.content })) };

  const cp = await prisma.designCheckpoint.create({
    data: { chatId, projectId: proj.id, userId: access.user.id, name, snapshot: snapshot as any },
  });

  await logAudit({ userId: access.user.id, action: "design-checkpoint", resource: "chat", resourceId: chatId });

  return NextResponse.json({ id: cp.id, name: cp.name, createdAt: cp.createdAt });
}
