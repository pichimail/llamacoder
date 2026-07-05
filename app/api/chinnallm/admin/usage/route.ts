import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    const error: any = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
  return user;
}

/** Usage statistics with aggregations by model, tier, user, and day. */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin-usage:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prisma = getPrisma();

    const [totals, byModel, byUser, records] = await Promise.all([
      prisma.chinnaLLMUsage.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, creditsUsed: true },
        _count: { id: true },
        _avg: { latencyMs: true },
      }),
      prisma.chinnaLLMUsage.groupBy({
        by: ["modelId"],
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, creditsUsed: true },
        _count: { id: true },
      }),
      prisma.chinnaLLMUsage.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since } },
        _sum: { creditsUsed: true },
        _count: { id: true },
        orderBy: { _sum: { creditsUsed: "desc" } },
        take: 25,
      }),
      prisma.chinnaLLMUsage.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, creditsUsed: true, error: true, model: { select: { tier: true, displayName: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Aggregate by tier and by day in application code (groupBy can't reach relations).
    const byTier: Record<string, { calls: number; creditsUsed: number }> = {};
    const byDay: Record<string, { calls: number; creditsUsed: number; errors: number }> = {};
    for (const record of records) {
      const tier = record.model?.tier ?? "unknown";
      byTier[tier] = byTier[tier] || { calls: 0, creditsUsed: 0 };
      byTier[tier].calls += 1;
      byTier[tier].creditsUsed += record.creditsUsed;
      const day = record.createdAt.toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { calls: 0, creditsUsed: 0, errors: 0 };
      byDay[day].calls += 1;
      byDay[day].creditsUsed += record.creditsUsed;
      if (record.error) byDay[day].errors += 1;
    }

    const modelNames = await prisma.chinnaLLMModel.findMany({ select: { id: true, displayName: true, tier: true } });
    const nameById = new Map(modelNames.map((m) => [m.id, m]));

    return NextResponse.json({
      windowDays: days,
      totals: {
        calls: totals._count.id,
        inputTokens: totals._sum.inputTokens ?? 0,
        outputTokens: totals._sum.outputTokens ?? 0,
        creditsUsed: totals._sum.creditsUsed ?? 0,
        avgLatencyMs: Math.round(totals._avg.latencyMs ?? 0),
      },
      byModel: byModel.map((row) => ({
        modelId: row.modelId,
        displayName: nameById.get(row.modelId)?.displayName ?? "Unknown",
        tier: nameById.get(row.modelId)?.tier ?? "unknown",
        calls: row._count.id,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        creditsUsed: row._sum.creditsUsed ?? 0,
      })),
      byTier,
      byUser: byUser.map((row) => ({ userId: row.userId, calls: row._count.id, creditsUsed: row._sum.creditsUsed ?? 0 })),
      byDay,
    });
  } catch (error) {
    if (error && typeof error === "object" && (error as any).status === 403) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Could not load usage" }, { status: 500 });
  }
}
