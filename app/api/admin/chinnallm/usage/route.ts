import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** Usage analytics with filters + CSV export (Phase 4). */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-usage:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59") : new Date();
    const tier = searchParams.get("tier") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const byokParam = searchParams.get("byok");
    const format = searchParams.get("format");
    const take = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1), 500);

    const prisma = getPrisma();
    const where = {
      createdAt: { gte: from, lte: to },
      ...(userId ? { userId } : {}),
      ...(byokParam === "true" ? { isByok: true } : byokParam === "false" ? { isByok: false } : {}),
      ...(tier ? { model: { tier } } : {}),
    };

    const [records, totals] = await Promise.all([
      prisma.chinnaLLMUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: format === "csv" ? 5000 : take,
        include: { model: { select: { displayName: true, tier: true } } },
      }),
      prisma.chinnaLLMUsage.aggregate({
        where,
        _count: { id: true },
        _sum: { inputTokens: true, outputTokens: true, creditsUsed: true },
        _avg: { latencyMs: true },
      }),
    ]);

    const errorCount = await prisma.chinnaLLMUsage.count({ where: { ...where, error: { not: null } } });

    if (format === "csv") {
      const header = "timestamp,userId,model,tier,inputTokens,outputTokens,credits,latencyMs,byok,error";
      const rows = records.map((r) =>
        [
          r.createdAt.toISOString(), r.userId, r.model?.displayName ?? "", r.model?.tier ?? "",
          r.inputTokens, r.outputTokens, r.creditsUsed, r.latencyMs ?? "",
          r.isByok, r.error ? `"${r.error.replace(/"/g, "'").slice(0, 100)}"` : "",
        ].join(","),
      );
      return new Response([header, ...rows].join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="chinnallm-usage-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary: {
        totalCalls: totals._count.id,
        totalTokens: (totals._sum.inputTokens ?? 0) + (totals._sum.outputTokens ?? 0),
        totalCredits: totals._sum.creditsUsed ?? 0,
        avgLatencyMs: Math.round(totals._avg.latencyMs ?? 0),
        errorRate: totals._count.id > 0 ? Math.round((errorCount / totals._count.id) * 100) : 0,
      },
      records: records.map((r) => ({
        id: r.id, userId: r.userId, model: r.model?.displayName ?? "—", tier: r.model?.tier ?? "—",
        inputTokens: r.inputTokens, outputTokens: r.outputTokens, creditsUsed: r.creditsUsed,
        latencyMs: r.latencyMs, isByok: r.isByok, error: r.error, createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load usage" }, { status: 500 });
  }
}
