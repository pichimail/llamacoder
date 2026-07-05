import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** Paginated credit transaction log with filters (Phase 4). */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-credit-transactions:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10) || 25, 1), 100);
    const type = searchParams.get("type") || undefined;
    const userQuery = searchParams.get("user") || undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59") : undefined;

    const prisma = getPrisma();
    let userIds: string[] | undefined;
    if (userQuery) {
      const users = await prisma.user.findMany({
        where: { OR: [{ email: { contains: userQuery, mode: "insensitive" } }, { name: { contains: userQuery, mode: "insensitive" } }] },
        select: { id: true },
        take: 50,
      });
      userIds = users.map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json({ transactions: [], total: 0, page, pageSize });
    }

    const where = {
      ...(type ? { type } : {}),
      ...(userIds ? { userId: { in: userIds } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    // Attach user email for display
    const ids = Array.from(new Set(transactions.map((t) => t.userId)));
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } });
    const userById = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        userEmail: userById.get(t.userId)?.email ?? t.userId,
        userName: userById.get(t.userId)?.name ?? null,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load transactions" }, { status: 500 });
  }
}
