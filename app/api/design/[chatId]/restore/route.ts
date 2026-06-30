import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireChatAccess } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { validateGeneratedCodeFiles } from "@/lib/generated-code-validation";
import { logAudit } from "@/lib/audit";

const schema = z.object({ checkpointId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  let access;
  try {
    access = await requireChatAccess(chatId, "editor");
  } catch (e: any) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "checkpointId required" }, { status: 400 });

  const prisma = getPrisma();
  const cp = await prisma.designCheckpoint.findUnique({ where: { id: p.data.checkpointId } });
  if (!cp || cp.chatId !== chatId) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });

  const snapshot = cp.snapshot as any;
  const files = Array.isArray(snapshot?.files) ? snapshot.files : [];

  // validate
  const issues = await validateGeneratedCodeFiles(files);
  if (issues.length > 0) {
    return NextResponse.json({ ok: false, error: "Validation failed on restore" }, { status: 400 });
  }

  const proj = await prisma.project.findFirst({ where: { chats: { some: { id: chatId } } } });
  if (!proj) return NextResponse.json({ error: "No project" }, { status: 404 });

  await prisma.$transaction([
    prisma.projectFile.deleteMany({ where: { projectId: proj.id } }),
    ...files.map((f: any) => prisma.projectFile.create({
      data: { projectId: proj.id, path: f.path, content: f.content },
    })),
  ]);

  await logAudit({ userId: access.user.id, action: "design-restore", resource: "chat", resourceId: chatId, metadata: { checkpointId: cp.id } });

  return NextResponse.json({ ok: true, restored: files.length });
}
