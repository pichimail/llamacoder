import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrNull, requireMessageAccess, AuthError, authErrorResponse } from "@/lib/authz";

const bodySchema = z.object({
  previewImageUrl: z.string().url(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserOrNull();
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

    // Check message access (read is sufficient to update preview)
    if (user) {
      try {
        await requireMessageAccess(id, user.id, "read");
      } catch (error) {
        if (error instanceof AuthError) {
          return authErrorResponse(error);
        }
        throw error;
      }
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
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("Preview image update error:", error);
    return NextResponse.json({ error: "Failed to update preview image" }, { status: 500 });
  }
}
