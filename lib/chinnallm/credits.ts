/** ChinnaLLM credit ledger (Phase 2+5).
 * All balance mutations are transactional. Streaming calls reserve credits before
 * the provider call and reconcile after completion so users cannot receive a
 * stream that later fails to deduct.
 */
import { getPrisma } from "@/lib/prisma";
import { getEffectiveMonthlyGrant } from "@/lib/plan";

export const CREDIT_COSTS: Record<string, number> = {
  free: 0,
  budget: 1,
  coding: 3,
  flagship: 10,
  reasoning: 8,
  vision: 5,
  image: 20,
  video: 50,
  music: 30,
  code: 5,
  auto: 3,
};

export const PLAN_MONTHLY_GRANTS: Record<string, number> = {
  free: 100,
  pro: 1000,
  enterprise: 1000,
};

export class CreditExhaustedError extends Error {
  balance: number;
  needed: number;
  upgradeUrl: string;

  constructor(balance: number, needed: number) {
    super("ChinnaLLM credits exhausted");
    this.name = "CreditExhaustedError";
    this.balance = balance;
    this.needed = needed;
    this.upgradeUrl = "/settings#billing";
  }
}

export async function ensureUserCredits(userId: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userCredits.findUnique({ where: { userId } });
    if (existing) return existing;

    const created = await tx.userCredits.create({
      data: { userId, planTier: "free", totalGranted: PLAN_MONTHLY_GRANTS.free, totalUsed: 0 },
    });
    await tx.creditTransaction.create({
      data: { userId, amount: PLAN_MONTHLY_GRANTS.free, type: "grant", reason: "Initial free grant" },
    });
    return created;
  });
}

export async function getBalance(userId: string) {
  const credits = await checkAndResetMonthly(userId);
  return {
    balance: Math.max(credits.totalGranted - credits.totalUsed, 0),
    planTier: credits.planTier,
    totalGranted: credits.totalGranted,
    totalUsed: credits.totalUsed,
    monthlyResetAt: credits.monthlyResetAt,
  };
}

export async function deductCredits(userId: string, amount: number, reason: string, chatId?: string) {
  if (amount <= 0) return getBalance(userId);
  const prisma = getPrisma();
  await ensureUserCredits(userId);
  await prisma.$transaction(async (tx) => {
    const credits = await tx.userCredits.findUnique({ where: { userId } });
    if (!credits) throw new Error("Credits row missing");
    const balance = credits.totalGranted - credits.totalUsed;
    if (balance < amount) throw new CreditExhaustedError(Math.max(balance, 0), amount);
    await tx.userCredits.update({ where: { userId }, data: { totalUsed: { increment: amount } } });
    await tx.creditTransaction.create({
      data: { userId, amount: -amount, type: "deduct", reason, relatedChatId: chatId ?? null },
    });
  });
  return getBalance(userId);
}

export async function grantCredits(userId: string, amount: number, reason: string) {
  if (amount <= 0) return getBalance(userId);
  const prisma = getPrisma();
  await ensureUserCredits(userId);
  await prisma.$transaction(async (tx) => {
    await tx.userCredits.update({ where: { userId }, data: { totalGranted: { increment: amount } } });
    await tx.creditTransaction.create({ data: { userId, amount, type: "grant", reason } });
  });
  return getBalance(userId);
}

export async function refundCredits(userId: string, amount: number, reason: string, chatId?: string) {
  if (amount <= 0) return getBalance(userId);
  const prisma = getPrisma();
  await ensureUserCredits(userId);
  await prisma.$transaction(async (tx) => {
    await tx.userCredits.update({
      where: { userId },
      data: { totalUsed: { decrement: amount } },
    });
    await tx.creditTransaction.create({
      data: { userId, amount, type: "refund", reason, relatedChatId: chatId ?? null },
    });
  });
  return getBalance(userId);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Monthly reset: if the last reset is older than 30 days, reset to the plan allowance. */
export async function checkAndResetMonthly(userId: string) {
  const prisma = getPrisma();
  const credits = await ensureUserCredits(userId);
  if (Date.now() - credits.monthlyResetAt.getTime() < THIRTY_DAYS_MS) return credits;

  const grant = await getEffectiveMonthlyGrant(credits.planTier);
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.userCredits.findUnique({ where: { userId } });
    if (!fresh || Date.now() - fresh.monthlyResetAt.getTime() < THIRTY_DAYS_MS) return fresh!;
    const updated = await tx.userCredits.update({
      where: { userId },
      data: { totalGranted: grant, totalUsed: 0, monthlyResetAt: new Date() },
    });
    await tx.creditTransaction.create({
      data: { userId, amount: grant, type: "monthly_reset", reason: `Monthly ${fresh.planTier} plan reset` },
    });
    return updated;
  });
}

export function estimateCredits(tier: string, estimatedKTokens = 1): number {
  const perK = CREDIT_COSTS[tier] ?? CREDIT_COSTS.auto;
  return Math.max(Math.ceil(perK * estimatedKTokens), perK === 0 ? 0 : 1);
}
