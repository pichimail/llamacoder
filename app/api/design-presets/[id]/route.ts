import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";

/** Fetch the full content of one saved design preset (owner-only) — used
 * when a user picks a previously-saved custom design to apply to a new
 * build. The list route deliberately omits `content`/`instructions` to
 * keep the list payload small; this route returns the full record. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const prisma = getPrisma();
    const preset = await prisma.designPreset.findFirst({
      where: { id, userId: user.id },
    });
    if (!preset) return NextResponse.json({ error: "Design preset not found" }, { status: 404 });
    return NextResponse.json({ preset });
  } catch (error) {
    const handled = authErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load design preset" }, { status: 500 });
  }
}
