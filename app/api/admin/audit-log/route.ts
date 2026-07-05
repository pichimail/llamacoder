import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** Read-only admin audit trail. Defaults to admin.* actions (moderation, plan
 * config, settings) so the artifacts page can show "who did what". */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-audit:${admin.id}`, { limit: 60, windowSeconds: 60 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "30", 10) || 30, 1), 100);
    const resourceId = searchParams.get("resourceId") || undefined;
    const prefix = searchParams.get("prefix") ?? "admin."; // action prefix filter; "" = all

    const prisma = getPrisma();
    const where = {
      ...(resourceId ? { resourceId } : {}),
      ...(prefix ? { action: { startsWith: prefix } } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      rows: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        metadata: l.metadata,
        createdAt: l.createdAt,
        actor: l.user ? { id: l.user.id, email: l.user.email, name: l.user.name } : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
