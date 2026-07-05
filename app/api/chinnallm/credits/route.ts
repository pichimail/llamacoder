import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getBalance } from "@/lib/chinnallm/credits";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-credits:${user.id}`, { limit: 60, windowSeconds: 60 });
    const balance = await getBalance(user.id);
    const prisma = getPrisma();
    const [recentTransactions, usageAggregate] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, amount: true, type: true, reason: true, createdAt: true },
      }),
      prisma.chinnaLLMUsage.aggregate({
        where: { userId: user.id },
        _sum: { inputTokens: true, outputTokens: true, creditsUsed: true },
        _count: { id: true },
      }),
    ]);
    return NextResponse.json({
      ...balance,
      usage: {
        totalCalls: usageAggregate._count.id,
        inputTokens: usageAggregate._sum.inputTokens ?? 0,
        outputTokens: usageAggregate._sum.outputTokens ?? 0,
        creditsUsed: usageAggregate._sum.creditsUsed ?? 0,
      },
      recentTransactions,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Could not load credit balance" }, { status: 500 });
  }
}
