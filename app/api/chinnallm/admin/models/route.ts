import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { CHINNALLM_TIERS } from "@/lib/chinnallm/models";

/** Admin CRUD for ChinnaLLM models — the ONLY user-reachable surface where openRouterId appears. */

async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    const error: any = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
  return user;
}

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

function adminError(error: unknown) {
  if (error && typeof error === "object" && (error as any).status === 403) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return authErrorResponse(error);
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin-models:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const prisma = getPrisma();
    const models = await prisma.chinnaLLMModel.findMany({ orderBy: [{ tier: "asc" }, { sortOrder: "asc" }] });
    return NextResponse.json({ models });
  } catch (error) {
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load models" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin:${user.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = modelSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const prisma = getPrisma();
    const model = await prisma.chinnaLLMModel.create({ data: { ...parsed.data, description: parsed.data.description ?? null } });
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create model" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin:${user.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const { id, ...data } = parsed.data;
    const prisma = getPrisma();
    const model = await prisma.chinnaLLMModel.update({ where: { id }, data });
    return NextResponse.json({ model });
  } catch (error) {
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not update model" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin:${user.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Provide model id" }, { status: 400 });
    const prisma = getPrisma();
    await prisma.chinnaLLMModel.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not delete model" }, { status: 500 });
  }
}
