import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

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

  const prisma = getPrisma();
  const message = await prisma.message.findUnique({ where: { id } });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.role !== "assistant") {
    return NextResponse.json(
      { error: "Preview images can only be saved on assistant messages" },
      { status: 400 },
    );
  }

  await prisma.message.update({
    where: { id },
    data: { previewImageUrl: parsed.data.previewImageUrl },
  });

  return NextResponse.json({ ok: true });
}