import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";

const MAX_CONTENT_CHARS = 40000;

const createSchema = z.object({
  name: z.string().min(1).max(120),
  source: z.enum(["paste", "upload", "github", "website"]),
  sourceRef: z.string().url().max(500).optional().or(z.literal("")),
  content: z.string().min(1).max(MAX_CONTENT_CHARS),
  instructions: z.string().max(4000).optional(),
});

/** List the current user's saved custom design systems, newest first. */
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const prisma = getPrisma();
    let presets: any[] = [];
    try {
      presets = await prisma.designPreset.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, source: true, sourceRef: true, createdAt: true, updatedAt: true },
        take: 50,
      });
    } catch (dbErr) {
      // Table may not exist yet (migration pending) — degrade gracefully
      console.warn("design-presets table missing or query failed (migration needed?):", dbErr);
      presets = [];
    }
    return NextResponse.json({ presets });
  } catch (error) {
    const handled = authErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load design presets" }, { status: 500 });
  }
}

/**
 * Save a new custom design system from the "Start with your design" flow.
 * `content` is the DESIGN.md text (pasted directly, extracted from an
 * uploaded file, or a best-effort summary when the source is a GitHub repo
 * or website — extraction for those two sources is not implemented in this
 * pass; the route accepts and stores whatever text the client sends, so the
 * client is responsible for being honest with the user about what was
 * actually captured from those sources today).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`design-preset-create:${user.id}`, { limit: 20, windowSeconds: 3600 });
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }
    const { name, source, sourceRef, content, instructions } = parsed.data;
    const prisma = getPrisma();
    const count = await prisma.designPreset.count({ where: { userId: user.id } });
    if (count >= 50) {
      return NextResponse.json({ error: "You've reached the 50 saved design limit. Delete one to add another." }, { status: 400 });
    }
    const preset = await prisma.designPreset.create({
      data: {
        userId: user.id,
        name,
        source,
        sourceRef: sourceRef || null,
        content,
        instructions: instructions || null,
      },
      select: { id: true, name: true, source: true, sourceRef: true, createdAt: true },
    });
    return NextResponse.json({ preset });
  } catch (error) {
    const handled = authErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not save design preset" }, { status: 500 });
  }
}

const deleteSchema = z.object({ id: z.string().min(1).max(64) });

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const prisma = getPrisma();
    await prisma.designPreset.deleteMany({ where: { id: parsed.data.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const handled = authErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not delete design preset" }, { status: 500 });
  }
}
