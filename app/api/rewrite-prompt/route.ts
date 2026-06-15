import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFallbackModel } from "@/lib/constants";
import { createTextWithFallback } from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";

const schema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  mode: z.enum(["ask", "plan", "agent"]).optional().default("agent"),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await rateLimitOrThrow(`rewrite:${request.headers.get("x-forwarded-for") || "local"}`, { limit: 30, windowSeconds: 60 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limited" }, { status: 429 });
  }

  const { prompt, mode, model } = parsed.data;
  const result = await createTextWithFallback({
    model: model || getFallbackModel().value,
    temperature: 0.25,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "Rewrite the user's app-building prompt into a concise implementation brief. Preserve intent, feature list, visual constraints, responsive behavior, data needs, and acceptance criteria. Do not add fake features. Output only the improved prompt.",
      },
      { role: "user", content: `Mode: ${mode}\n\nPrompt:\n${prompt}` },
    ],
  });

  return NextResponse.json({ prompt: result.content.trim() || prompt });
}

export const runtime = "nodejs";
