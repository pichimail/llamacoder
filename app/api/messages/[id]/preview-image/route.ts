import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { requireMessageAccess } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  previewImageUrl: z.string().url(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preview image URL" }, { status: 400 });
  }

  let access;
  try {
    access = await requireMessageAccess(id, "editor");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Forbidden" }, { status: e?.status || 403 });
  }

  try {
    await rateLimitOrThrow(`preview:${access.user.id}`, { limit: 60, windowSeconds: 60 });
  } catch (error) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const prisma = getPrisma();
  await prisma.message.update({
    where: { id },
    data: { previewImageUrl: parsed.data.previewImageUrl },
  });

  await logAudit({ userId: access.user.id, action: "save-preview", resource: "message", resourceId: id });

  return NextResponse.json({ ok: true });
}