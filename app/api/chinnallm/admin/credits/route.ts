import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { grantCredits, deductCredits, CreditExhaustedError } from "@/lib/chinnallm/credits";

async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    const error: any = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
  return user;
}

function adminError(error: unknown) {
  if (error && typeof error === "object" && (error as any).status === 403) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return authErrorResponse(error);
}

const adjustSchema = z.object({
  userId: z.string().min(1).max(64),
  amount: z.number().int().min(1).max(1000000),
  action: z.enum(["grant", "deduct"]),
  reason: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin-credits:${admin.id}`, { limit: 30, windowSeconds: 60 });
    const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const { userId, amount, action, reason } = parsed.data;
    const note = reason || `Admin ${action} by ${admin.id}`;
    const balance = action === "grant"
      ? await grantCredits(userId, amount, note)
      : await deductCredits(userId, amount, note);
    return NextResponse.json({ balance });
  } catch (error) {
    if (error instanceof CreditExhaustedError) {
      return NextResponse.json({ error: error.message, balance: error.balance, needed: error.needed }, { status: 402 });
    }
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not adjust credits" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`chinnallm-admin-credits-list:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const type = searchParams.get("type") || undefined;
    const take = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 200);
    const prisma = getPrisma();
    const transactions = await prisma.creditTransaction.findMany({
      where: { ...(userId ? { userId } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json({ transactions });
  } catch (error) {
    const handled = adminError(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Could not load transactions" }, { status: 500 });
  }
}
