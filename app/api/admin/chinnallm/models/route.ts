import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { CHINNALLM_TIERS } from "@/lib/chinnallm/models";

/** Admin CRUD for ChinnaLLM models (Phase 4 path). openRouterId visible here only. */

const modelSchema = z.object({
  displayName: z.string().min(1).max(120),
  openRouterId: z.string().min(1).max(200),
  tier: z.enum(CHINNALLM_TIERS as [string, ...string[]]),
  costPerKTokens: z.number().int().min(0).max(10000).default(1),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string().max(40)).max(12).default([]),
});

const updateSchema = modelSchema.partial().extend({ id: z.string().min(1).max(64) });
const deleteSchema = z.object({ id: z.string().min(1).max(64) });

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-models-list:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") || undefined;
    const prisma = getPrisma();
    const models = await prisma.chinnaLLMModel.findMany({
      where: tier ? { tier } : undefined,
      orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ models });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load models" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-models:${admin.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = modelSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const prisma = getPrisma();
    const model = await prisma.chinnaLLMModel.create({ data: { ...parsed.data, description: parsed.data.description ?? null } });
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create model" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-models:${admin.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const { id, ...data } = parsed.data;
    const prisma = getPrisma();
    const model = await prisma.chinnaLLMModel.update({ where: { id }, data });
    return NextResponse.json({ model });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not update model" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-models:${admin.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Provide model id" }, { status: 400 });
    const prisma = getPrisma();
    await prisma.chinnaLLMModel.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not delete model. Models with usage records cannot be deleted; disable instead." }, { status: 500 });
  }
}
