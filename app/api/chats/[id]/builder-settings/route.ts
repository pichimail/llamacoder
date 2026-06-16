import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const schema = z.object({
  shadcn: z.boolean().optional(),
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

  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const updated = await prisma.chat.update({
    where: { id },
    data: {
      ...(parsed.data.shadcn !== undefined ? { shadcn: parsed.data.shadcn } : {}),
    },
    select: { id: true, shadcn: true },
  });

  return NextResponse.json(updated);
}

export const runtime = "nodejs";