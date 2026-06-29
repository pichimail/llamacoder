import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getUserGenerationSettings,
  patchUserGenerationSettings,
  publicUserGenerationSettings,
  type UserGenerationSettings,
} from "@/lib/user-generation-settings";

export const runtime = "nodejs";

function nowSecret(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (!value || value.includes("••••") || value.trim() === "") return undefined;
  return { value: value.trim(), updatedAt: new Date().toISOString() };
}

function normalizeMode(value: unknown): UserGenerationSettings["defaultMode"] | undefined {
  return value === "ask" || value === "plan" || value === "agent" ? value : undefined;
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildPatch(payload: any): Partial<UserGenerationSettings> {
  const patch: Partial<UserGenerationSettings> = {};
  const defaultModel = normalizeString(payload?.defaultModel);
  const promptStyle = normalizeString(payload?.promptStyle);
  const defaultMode = normalizeMode(payload?.defaultMode);

  if (defaultModel) patch.defaultModel = defaultModel;
  if (promptStyle) patch.promptStyle = promptStyle;
  if (defaultMode) patch.defaultMode = defaultMode;
  if (payload?.artifactPrefs && typeof payload.artifactPrefs === "object") {
    patch.artifactPrefs = {
      shadcn: Boolean(payload.artifactPrefs.shadcn),
      accessibility: Boolean(payload.artifactPrefs.accessibility),
      responsive: Boolean(payload.artifactPrefs.responsive),
      strictBackend: Boolean(payload.artifactPrefs.strictBackend),
    };
  }

  const aiKeys: UserGenerationSettings["aiKeys"] = {};
  const openrouter = nowSecret(payload?.aiKeys?.openrouter?.value);
  const together = nowSecret(payload?.aiKeys?.together?.value);
  const gemini = nowSecret(payload?.aiKeys?.gemini?.value);
  const anthropic = nowSecret(payload?.aiKeys?.anthropic?.value);
  if (openrouter) aiKeys.openrouter = openrouter;
  if (together) aiKeys.together = together;
  if (gemini) aiKeys.gemini = gemini;
  if (anthropic) aiKeys.anthropic = anthropic;
  if (Object.keys(aiKeys).length > 0) patch.aiKeys = aiKeys;

  const dbSecret = nowSecret(payload?.database?.url?.value);
  if (normalizeString(payload?.database?.provider) || dbSecret) {
    patch.database = {
      provider: normalizeString(payload?.database?.provider),
      ...(dbSecret ? { url: dbSecret } : {}),
    };
  }

  if (Array.isArray(payload?.mcpServers)) {
    patch.mcpServers = payload.mcpServers
      .filter((item: any) => item?.id && item?.name)
      .map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        url: String(item.url || ""),
        token: typeof item.token === "string" ? item.token : undefined,
        enabled: item.enabled !== false,
      }));
  }

  if (Array.isArray(payload?.connectors)) {
    patch.connectors = payload.connectors
      .filter((item: any) => item?.id && item?.name)
      .map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        type: ["webhook", "database", "api", "mcp"].includes(item.type) ? item.type : "webhook",
        endpoint: String(item.endpoint || ""),
        token: typeof item.token === "string" ? item.token : undefined,
        enabled: item.enabled !== false,
      }));
  }

  return patch;
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

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
  }

  const settings = await patchUserGenerationSettings(userId, buildPatch(payload));
  return NextResponse.json(publicUserGenerationSettings(settings));
}
