import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { getImageOrVideoJobStatus, getMusicJobStatus } from "@/lib/kie-ai";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const prisma = getPrisma();

  const generation = await prisma.studioGeneration.findUnique({ where: { id } });
  if (!generation || generation.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generation.status !== "generating" || !generation.taskId) {
    return NextResponse.json(generation);
  }

  try {
    const result =
      generation.kind === "music"
        ? await getMusicJobStatus(generation.taskId)
        : await getImageOrVideoJobStatus(generation.taskId);

    if (result.status === "generating") {
      return NextResponse.json(generation);
    }

    const updated = await prisma.studioGeneration.update({
      where: { id },
      data: {
        status: result.status,
        resultUrls: result.resultUrls,
        title: result.title,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { ...generation, error: error instanceof Error ? error.message : "Failed to check status." },
      { status: 200 },
    );
  }
}
