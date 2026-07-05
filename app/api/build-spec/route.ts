import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildPhaseOneResponse } from "@/lib/build-engine";

const schema = z.object({
  prompt: z.string().trim().min(1),
  mode: z.enum(["ask", "plan", "agent"]).optional().default("agent"),
  shadcn: z.boolean().optional().default(true),
  backendMode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
  }

  const result = buildPhaseOneResponse(parsed.data);
  return NextResponse.json(result);
}
