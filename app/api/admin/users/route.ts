import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** Admin user list with credit + BYOK + app-count data (Phase 4). */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-users:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10) || 25, 1), 100);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const byok = searchParams.get("byok"); // "true" | "false" | null
    const sort = searchParams.get("sort") || "joined"; // joined|credits|apps

    const prisma = getPrisma();
    const where = {
      ...(search
        ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
        : {}),
      ...(plan ? { credits: { planTier: plan } } : {}),
      ...(byok === "true" ? { apiKeys: { some: {} } } : byok === "false" ? { apiKeys: { none: {} } } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, name: true, image: true, createdAt: true,
          role: true, banned: true,
          credits: { select: { planTier: true, totalGranted: true, totalUsed: true } },
          apiKeys: { select: { id: true, provider: true } },
          projects: { select: { _count: { select: { chats: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    let rows = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      joinedAt: user.createdAt,
      isAdmin: user.role === "admin",
      banned: user.banned,
      planTier: user.credits?.planTier ?? "free",
      creditBalance: user.credits ? Math.max(user.credits.totalGranted - user.credits.totalUsed, 0) : null,
      byokCount: user.apiKeys.length,
      appsBuilt: user.projects.reduce((sum, project) => sum + project._count.chats, 0),
    }));

    if (sort === "credits") rows = rows.sort((a, b) => (b.creditBalance ?? -1) - (a.creditBalance ?? -1));
    if (sort === "apps") rows = rows.sort((a, b) => b.appsBuilt - a.appsBuilt);

    return NextResponse.json({ users: rows, total, page, pageSize });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}
