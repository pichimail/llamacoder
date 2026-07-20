import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();

  const generations = await prisma.studioGeneration.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json({ generations });
}
