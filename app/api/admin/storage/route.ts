import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";

/** Admin storage overview: blob provider config + real FileUpload volume. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-storage:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const prisma = getPrisma();

    const [totals, byMimeType, recentUploads] = await Promise.all([
      prisma.fileUpload.aggregate({ _count: { id: true }, _sum: { size: true } }),
      prisma.fileUpload.groupBy({ by: ["mimeType"], _count: { mimeType: true }, _sum: { size: true } }),
      prisma.fileUpload.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      configured: !!process.env.BLOB_READ_WRITE_TOKEN,
      totals: {
        fileCount: totals._count.id,
        totalBytes: totals._sum.size ?? 0,
      },
      byMimeType: byMimeType
        .map((row) => ({ mimeType: row.mimeType, count: row._count.mimeType, bytes: row._sum.size ?? 0 }))
        .sort((a, b) => b.bytes - a.bytes),
      recentUploads: recentUploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        mimeType: upload.mimeType,
        size: upload.size,
        createdAt: upload.createdAt,
        user: upload.user?.name || upload.user?.email || "—",
      })),
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load storage stats" }, { status: 500 });
  }
}
