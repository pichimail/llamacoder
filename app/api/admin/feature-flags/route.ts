import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { DEFAULT_FEATURE_FLAGS } from "@/lib/feature-flags";

const FLAGS_TAG = "feature-flags";

/** Admin: full flag list (defaults merged with DB state) + toggle. */
export async function GET() {
  try {
    await requireAdmin();
    const prisma = getPrisma();
    const rows = await prisma.featureFlag.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const flags = DEFAULT_FEATURE_FLAGS.map((def) => ({
      ...def,
      enabled: byKey.get(def.key)?.enabled ?? def.enabled,
      updatedAt: byKey.get(def.key)?.updatedAt ?? null,
    }));
    return NextResponse.json({ flags });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load flags" }, { status: 500 });
  }
}

const patchSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-flags:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const def = DEFAULT_FEATURE_FLAGS.find((f) => f.key === parsed.data.key);
    if (!def) return NextResponse.json({ error: "Unknown flag key" }, { status: 404 });
    const prisma = getPrisma();
    const flag = await prisma.featureFlag.upsert({
      where: { key: parsed.data.key },
      create: { key: def.key, label: def.label, description: def.description, category: def.category, enabled: parsed.data.enabled },
      update: { enabled: parsed.data.enabled },
    });
    revalidateTag(FLAGS_TAG);
    return NextResponse.json({ flag });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not update flag" }, { status: 500 });
  }
}
