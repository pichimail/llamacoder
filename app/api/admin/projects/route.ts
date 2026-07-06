import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-projects:${admin.id}`, { limit: 60, windowSeconds: 60 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
    const search = searchParams.get("search")?.trim();
    const owner = searchParams.get("owner")?.trim();
    const sort = searchParams.get("sort") || "updated";

    const prisma = getPrisma();
    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
              { user: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(owner
        ? {
            user: {
              OR: [
                { email: { contains: owner, mode: "insensitive" as const } },
                { name: { contains: owner, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const orderBy =
      sort === "name"
        ? { name: "asc" as const }
        : sort === "created"
          ? { createdAt: "desc" as const }
          : { updatedAt: "desc" as const };

    const [projects, total, counts] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, image: true, plan: true } },
          chats: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { id: true, title: true, model: true, updatedAt: true, isArchived: true },
          },
          deployments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, previewUrl: true, productionUrl: true } },
          _count: { select: { chats: true, members: true, files: true, deployments: true, envVars: true } },
        },
      }),
      prisma.project.count({ where }),
      Promise.all([
        prisma.project.count(),
        prisma.chat.count({ where: { isArchived: false } }),
        prisma.deployment.count({ where: { status: "ready" } }).catch(() => 0),
      ]),
    ]);

    return NextResponse.json({
      projects: projects.map((project) => {
        const latestDeployment = project.deployments[0] ?? null;
        const latestChat = project.chats[0] ?? null;
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          owner: project.user,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          latestChat,
          latestDeployment,
          counts: project._count,
          status: latestDeployment?.status || (project._count.chats > 0 ? "active" : "empty"),
        };
      }),
      total,
      page,
      pageSize,
      summary: {
        totalProjects: counts[0],
        activeChats: counts[1],
        readyDeployments: counts[2],
      },
    });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load projects" }, { status: 500 });
  }
}
