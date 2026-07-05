import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { grantCredits, deductCredits, CreditExhaustedError, PLAN_MONTHLY_GRANTS } from "@/lib/chinnallm/credits";

/** Manual + bulk credit operations (Phase 4). */

const manualSchema = z.object({
  op: z.literal("manual"),
  userId: z.string().min(1).max(64),
  amount: z.number().int().min(1).max(1000000),
  type: z.enum(["grant", "deduct"]),
  reason: z.string().max(300).optional(),
});

const bulkGrantSchema = z.object({
  op: z.literal("bulk-grant-free"),
  amount: z.number().int().min(1).max(100000),
  reason: z.string().max(300).optional(),
});

const bulkResetSchema = z.object({ op: z.literal("bulk-reset-monthly") });

const bodySchema = z.discriminatedUnion("op", [manualSchema, bulkGrantSchema, bulkResetSchema]);

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-credits:${admin.id}`, { limit: 20, windowSeconds: 60 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
    const body = parsed.data;
    const prisma = getPrisma();

    if (body.op === "manual") {
      const note = body.reason || `Admin ${body.type} by ${admin.email ?? admin.id}`;
      const balance = body.type === "grant"
        ? await grantCredits(body.userId, body.amount, note)
        : await deductCredits(body.userId, body.amount, note);
      return NextResponse.json({ balance });
    }

    if (body.op === "bulk-grant-free") {
      const freeUsers = await prisma.userCredits.findMany({ where: { planTier: "free" }, select: { userId: true } });
      let granted = 0;
      for (const row of freeUsers) {
        await grantCredits(row.userId, body.amount, body.reason || "Bulk grant to free tier").catch(() => undefined);
        granted += 1;
      }
      return NextResponse.json({ granted, amount: body.amount });
    }

    // bulk-reset-monthly: reset every credits row to its plan allowance now.
    const allCredits = await prisma.userCredits.findMany({ select: { userId: true, planTier: true } });
    let reset = 0;
    for (const row of allCredits) {
      const grant = PLAN_MONTHLY_GRANTS[row.planTier] ?? PLAN_MONTHLY_GRANTS.free;
      await prisma.$transaction(async (tx) => {
        await tx.userCredits.update({
          where: { userId: row.userId },
          data: { totalGranted: grant, totalUsed: 0, monthlyResetAt: new Date() },
        });
        await tx.creditTransaction.create({
          data: { userId: row.userId, amount: grant, type: "monthly_reset", reason: "Admin-triggered monthly reset" },
        });
      }).catch(() => undefined);
      reset += 1;
    }
    return NextResponse.json({ reset });
  } catch (error) {
    if (error instanceof CreditExhaustedError) {
      return NextResponse.json({ error: error.message, balance: error.balance, needed: error.needed }, { status: 402 });
    }
    const handled = adminErrorResponse(error);
    if (handled) return handled;
    return NextResponse.json({ error: "Credit operation failed" }, { status: 500 });
  }
}
