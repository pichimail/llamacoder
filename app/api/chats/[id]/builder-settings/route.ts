import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireChatAccess, authErrorResponse } from "@/lib/authz";

const schema = z.object({
  shadcn: z.boolean().optional(),
  model: z.string().min(1).optional(),
  quality: z.enum(["low", "high"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let prisma: any;
  try {
    const access = await requireChatAccess(id, "editor");
    prisma = access.prisma;
  } catch (error) {
    return authErrorResponse(error);
  }

  const updated = await prisma.chat.update({
    where: { id },
    data: {
      ...(parsed.data.shadcn !== undefined ? { shadcn: parsed.data.shadcn } : {}),
      ...(parsed.data.model !== undefined ? { model: parsed.data.model } : {}),
      ...(parsed.data.quality !== undefined ? { quality: parsed.data.quality } : {}),
    },
    select: { id: true, shadcn: true, model: true, quality: true },
  });

  return NextResponse.json(updated);
}

export const runtime = "nodejs";