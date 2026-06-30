import "server-only";
import { getPrisma } from "@/lib/prisma";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: any;
  ip?: string;
}) {
  try {
    const prisma = getPrisma();
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resource: params.resource || null,
        resourceId: params.resourceId || null,
        metadata: params.metadata ? (params.metadata as any) : null,
        ip: params.ip || null,
      },
    });
  } catch (e) {
    // Non-fatal
    if (process.env.NODE_ENV !== "production") console.warn("audit log failed", e);
  }
}
