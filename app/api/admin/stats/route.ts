import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";
import { MODELS } from "@/lib/constants";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prisma = getPrisma();
  const [chats, messages, settings] = await Promise.all([
    prisma.chat.count().catch(() => 0),
    prisma.message.count().catch(() => 0),
    getSettings(),
  ]);
  let users = 0;
  try {
    users = await prisma.user.count();
  } catch {} // User table may not exist until `prisma db push`

  const [recentChats, modelUsage] = await Promise.all([
    prisma.chat
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, model: true, createdAt: true },
      })
      .catch(() => []),
    prisma.chat
      .groupBy({ by: ["model"], _count: { model: true } })
      .catch(() => [] as any[]),
  ]);

  return NextResponse.json({
    counts: { chats, messages, users },
    settings,
    recentChats,
    modelUsage: modelUsage.map((m: any) => ({
      model: m.model,
      count: m._count.model,
    })),
    modelCatalog: MODELS,
    deploy: {
      provider: process.env.VERCEL ? "vercel" : "self-hosted",
      env: process.env.VERCEL_ENV || process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || "local",
      googleAuthConfigured:
        !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
      togetherConfigured: !!process.env.TOGETHER_API_KEY,
      databaseConfigured: !!process.env.DATABASE_URL,
    },
  });
}
