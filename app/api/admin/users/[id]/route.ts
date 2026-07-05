import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { ensureUserCredits } from "@/lib/chinnallm/credits";

/** Admin user detail + plan change + BYOK revoke (Phase 4). */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-user-detail:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { id } = await params;
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, image: true, createdAt: true, role: true, plan: true,
        credits: true,
        apiKeys: { select: { id: true, provider: true, label: true, createdAt: true } },
        projects: {
          select: {
            id: true, name: true,
            chats: { select: { id: true, title: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
          },
          take: 10,
        },
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [transactions, usageAgg] = await Promise.all([
      prisma.creditTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.chinnaLLMUsage.aggregate({ where: { userId: id }, _count: { id: true }, _sum: { creditsUsed: true } }),
    ]);

    return NextResponse.json({
      user: {
        ...user,
        creditBalance: user.credits ? Math.max(user.credits.totalGranted - user.credits.totalUsed, 0) : null,
        aiCalls: usageAgg._count.id,
        aiCreditsUsed: usageAgg._sum.creditsUsed ?? 0,
      },
      transactions,
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load user" }, { status: 500 });
  }
}

const patchSchema = z.object({
  planTier: z.enum(["free", "pro", "enterprise"]).optional(),
  revokeByok: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-user-patch:${admin.id}`, { limit: 30, windowSeconds: 60 });
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const prisma = getPrisma();

    if (parsed.data.planTier) {
      await ensureUserCredits(id);
      await prisma.userCredits.update({ where: { userId: id }, data: { planTier: parsed.data.planTier } });
      await prisma.user.update({ where: { id }, data: { plan: parsed.data.planTier } }).catch(() => undefined);
    }
    if (parsed.data.revokeByok) {
      await prisma.apiKeyStore.deleteMany({ where: { userId: id } });
    }
    return NextResponse.json({ updated: true });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}
