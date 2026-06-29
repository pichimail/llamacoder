import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  getUserGenerationSettings,
  patchUserGenerationSettings,
  publicUserGenerationSettings,
  type UserGenerationSettings,
} from "@/lib/user-generation-settings";

export const runtime = "nodejs";

const secretSchema = z.object({ value: z.string().optional() }).optional();
const settingsPatchSchema = z.object({
  defaultModel: z.string().min(1).optional(),
  defaultMode: z.enum(["ask", "plan", "agent"]).optional(),
  promptStyle: z.string().min(1).optional(),
  aiKeys: z
    .object({
      openrouter: secretSchema,
      together: secretSchema,
      gemini: secretSchema,
      anthropic: secretSchema,
    })
    .partial()
    .optional(),
  database: z
    .object({
      provider: z.string().optional(),
      url: secretSchema,
    })
    .partial()
    .optional(),
  mcpServers: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        url: z.string().min(1),
        token: z.string().optional(),
        enabled: z.boolean().default(true),
      }),
    )
    .optional(),
  connectors: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(["webhook", "database", "api", "mcp"]),
        endpoint: z.string().min(1),
        token: z.string().optional(),
        enabled: z.boolean().default(true),
      }),
    )
    .optional(),
  artifactPrefs: z
    .object({
      shadcn: z.boolean().optional(),
      accessibility: z.boolean().optional(),
      responsive: z.boolean().optional(),
      strictBackend: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

function nowSecret(value?: string) {
  if (!value || value.includes("••••") || value.trim() === "") return undefined;
  return { value: value.trim(), updatedAt: new Date().toISOString() };
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getUserGenerationSettings(userId);
  return NextResponse.json(publicUserGenerationSettings(settings));
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = settingsPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const patch: Partial<UserGenerationSettings> = {
    defaultModel: payload.defaultModel,
    defaultMode: payload.defaultMode,
    promptStyle: payload.promptStyle,
    artifactPrefs: payload.artifactPrefs,
    mcpServers: payload.mcpServers,
    connectors: payload.connectors,
  };

  const aiKeys: UserGenerationSettings["aiKeys"] = {};
  const openrouter = nowSecret(payload.aiKeys?.openrouter?.value);
  const together = nowSecret(payload.aiKeys?.together?.value);
  const gemini = nowSecret(payload.aiKeys?.gemini?.value);
  const anthropic = nowSecret(payload.aiKeys?.anthropic?.value);
  if (openrouter) aiKeys.openrouter = openrouter;
  if (together) aiKeys.together = together;
  if (gemini) aiKeys.gemini = gemini;
  if (anthropic) aiKeys.anthropic = anthropic;
  if (Object.keys(aiKeys).length > 0) patch.aiKeys = aiKeys;

  const dbSecret = nowSecret(payload.database?.url?.value);
  if (payload.database?.provider || dbSecret) {
    patch.database = {
      provider: payload.database?.provider,
      ...(dbSecret ? { url: dbSecret } : {}),
    };
  }

  const settings = await patchUserGenerationSettings(userId, patch);
  return NextResponse.json(publicUserGenerationSettings(settings));
}
