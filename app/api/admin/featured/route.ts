import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  createFeaturedPin,
  deleteFeaturedPin,
  getPinnedFeaturedApps,
} from "@/lib/featured-apps-server";
import { getPrisma } from "@/lib/prisma";
import { extractAllCodeBlocks } from "@/lib/utils";

const pinSchema = z.object({
  messageId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const [pins, candidates] = await Promise.all([
    getPinnedFeaturedApps(),
    prisma.message
      .findMany({
        where: { role: "assistant" },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          id: true,
          content: true,
          files: true,
          createdAt: true,
          chat: { select: { id: true, title: true, prompt: true, model: true } },
        },
      })
      .catch(() => []),
  ]);

  const pinCandidates = candidates
    .map((message) => {
      const fileCount = Array.isArray(message.files)
        ? (message.files as unknown[]).length
        : extractAllCodeBlocks(message.content).length;
      if (fileCount === 0) return null;
      return {
        messageId: message.id,
        chatId: message.chat.id,
        title: message.chat.title || "Untitled",
        prompt: message.chat.prompt,
        model: message.chat.model,
        fileCount,
        createdAt: message.createdAt,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ pins, candidates: pinCandidates });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = pinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const pin = await createFeaturedPin(parsed.data);
    return NextResponse.json({ pin });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pin" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await deleteFeaturedPin(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Pin not found" }, { status: 404 });
  }
}