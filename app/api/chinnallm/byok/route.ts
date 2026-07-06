import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { encrypt, maskKey } from "@/lib/chinnallm/encryption";
import { assertFeatureAllowed, PlanLimitError, planErrorResponseBody } from "@/lib/plan";
import { BYOK_PROVIDER_IDS } from "@/lib/chinnallm/provider-catalog";

const storeSchema = z.object({
  provider: z.enum(BYOK_PROVIDER_IDS).default("openrouter"),
  key: z.string().min(8).max(400),
  label: z.string().max(120).optional(),
});

const deleteSchema = z.object({ id: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-byok:${user.id}`, { limit: 10, windowSeconds: 60 });
    await assertFeatureAllowed(user.id, "byok");
    const parsed = storeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }
    const { provider, key, label } = parsed.data;
    const { encrypted, iv } = encrypt(key);
    const prisma = getPrisma();
    const stored = await prisma.apiKeyStore.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      create: { userId: user.id, provider, encryptedKey: encrypted, iv, label: label ?? null },
      update: { encryptedKey: encrypted, iv, label: label ?? null },
    });
    return NextResponse.json({ id: stored.id, provider: stored.provider, label: stored.label, masked: maskKey(key) });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(planErrorResponseBody(error), { status: error.status });
    }
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not store key" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-byok-list:${user.id}`, { limit: 60, windowSeconds: 60 });
    const prisma = getPrisma();
    const keys = await prisma.apiKeyStore.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, provider: true, label: true, createdAt: true, updatedAt: true },
    });
    // Keys are listed masked-by-omission: the ciphertext never leaves the server.
    return NextResponse.json({ keys: keys.map((k) => ({ ...k, masked: "ChinnaLLM key ••••" })) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Could not list keys" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-byok-delete:${user.id}`, { limit: 20, windowSeconds: 60 });
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Provide the key id to delete" }, { status: 400 });
    const prisma = getPrisma();
    const result = await prisma.apiKeyStore.deleteMany({ where: { id: parsed.data.id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Could not delete key" }, { status: 500 });
  }
}
