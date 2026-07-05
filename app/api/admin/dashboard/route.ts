import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** Aggregated stats for the admin dashboard home (Phase 4). */
export async function GET() {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-dashboard:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const prisma = getPrisma();
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, appsToday, activeToday, creditsTodayAgg, chats30d, usage30d, recentChats] = await Promise.all([
      prisma.user.count(),
      prisma.chat.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.chat.groupBy({ by: ["projectId"], where: { createdAt: { gte: dayStart } } }).then((rows) => rows.length).catch(() => 0),
      prisma.chinnaLLMUsage.aggregate({ where: { createdAt: { gte: dayStart } }, _sum: { creditsUsed: true } }),
      prisma.chat.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.chinnaLLMUsage.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { creditsUsed: true, model: { select: { tier: true, displayName: true } } },
      }),
      prisma.chat.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, title: true, prompt: true, model: true, createdAt: true,
          project: { select: { user: { select: { email: true, name: true } } } },
          messages: { where: { role: "assistant" }, take: 1, select: { id: true } },
        },
      }),
    ]);

    // Apps per day (30d)
    const appsPerDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      appsPerDay[day] = 0;
    }
    for (const chat of chats30d) {
      const day = chat.createdAt.toISOString().slice(0, 10);
      if (day in appsPerDay) appsPerDay[day] += 1;
    }

    // Credit usage by tier + model distribution (30d)
    const creditsByTier: Record<string, number> = {};
    const callsByModel: Record<string, number> = {};
    for (const record of usage30d) {
      const tier = record.model?.tier ?? "unknown";
      creditsByTier[tier] = (creditsByTier[tier] ?? 0) + record.creditsUsed;
      const name = record.model?.displayName ?? "Unknown";
      callsByModel[name] = (callsByModel[name] ?? 0) + 1;
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        appsToday,
        activeToday,
        creditsToday: creditsTodayAgg._sum.creditsUsed ?? 0,
      },
      appsPerDay: Object.entries(appsPerDay).map(([date, count]) => ({ date, count })),
      creditsByTier: Object.entries(creditsByTier).map(([tier, credits]) => ({ tier, credits })),
      callsByModel: Object.entries(callsByModel).map(([model, calls]) => ({ model, calls })),
      recentActivity: recentChats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        promptPreview: (chat.prompt || "").slice(0, 80),
        model: chat.model,
        user: chat.project?.user?.name || chat.project?.user?.email || "—",
        status: chat.messages.length > 0 ? "ready" : "pending",
        createdAt: chat.createdAt,
      })),
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load dashboard" }, { status: 500 });
  }
}
