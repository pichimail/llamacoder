import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentUser } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import {
  createImageJob,
  createMusicJob,
  createVideoJob,
  isKieAiConfigured,
} from "@/lib/kie-ai";

const requestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    prompt: z.string().min(1).max(2000),
    aspectRatio: z.enum(["1:1", "2:3", "3:2", "16:9", "9:16"]).optional(),
    quality: z.enum(["speed", "pro"]).optional(),
  }),
  z.object({
    kind: z.literal("video"),
    provider: z.enum(["kling", "seedance"]),
    prompt: z.string().min(1).max(2000),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]).optional(),
    duration: z.enum(["5", "10"]).optional(),
    sound: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("music"),
    prompt: z.string().min(1).max(2000),
    title: z.string().max(80).optional(),
    style: z.string().max(200).optional(),
    instrumental: z.boolean().optional(),
  }),
]);

export async function POST(request: Request) {
  if (!isKieAiConfigured()) {
    return NextResponse.json(
      { error: "Studio generation is not configured. Add KIE_AI_API_KEY in environment settings." },
      { status: 500 },
    );
  }

  const user = await requireCurrentUser();

  try {
    await rateLimitOrThrow(`studio-generate:${user.id}`, { limit: 12, windowSeconds: 60 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limited" }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const prisma = getPrisma();

  try {
    let taskId: string;
    let provider: string;
    const options: Record<string, unknown> = { ...body };
    delete options.kind;
    delete options.prompt;

    if (body.kind === "image") {
      provider = "grok-imagine";
      ({ taskId } = await createImageJob({ prompt: body.prompt, aspectRatio: body.aspectRatio, quality: body.quality }));
    } else if (body.kind === "video") {
      provider = body.provider;
      ({ taskId } = await createVideoJob({
        provider: body.provider,
        prompt: body.prompt,
        aspectRatio: body.aspectRatio,
        duration: body.duration,
        sound: body.sound,
      }));
    } else {
      provider = "suno";
      ({ taskId } = await createMusicJob({
        prompt: body.prompt,
        title: body.title,
        style: body.style,
        instrumental: body.instrumental,
      }));
    }

    const generation = await prisma.studioGeneration.create({
      data: {
        userId: user.id,
        kind: body.kind,
        provider,
        prompt: body.prompt,
        options: options as object,
        taskId,
        status: "generating",
      },
    });

    await logAudit({ userId: user.id, action: "studio-generate", resource: "studioGeneration", resourceId: generation.id });

    return NextResponse.json({ id: generation.id, taskId, status: generation.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start generation." },
      { status: 502 },
    );
  }
}

export const runtime = "nodejs";
