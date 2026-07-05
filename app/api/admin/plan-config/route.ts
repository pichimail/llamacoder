import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-guard";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { getPlanConfig, savePlanConfig, DEFAULT_PLAN_LIMITS, PLAN_IDS, type PlanConfig } from "@/lib/plan";
import { CHINNALLM_TIERS } from "@/lib/chinnallm/tiers";

/** Live-editable pricing plan limits (Priority: admin plan config UI).
 * GET returns effective config + defaults + the tier catalog for the editor.
 * PUT persists overrides to the `plan_limits` Setting — no code deploy needed. */

export async function GET() {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-plan-config:${admin.id}`, { limit: 60, windowSeconds: 60 });
    const config = await getPlanConfig();
    return NextResponse.json({ config, defaults: DEFAULT_PLAN_LIMITS, tiers: CHINNALLM_TIERS });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

const limitsSchema = z.object({
  allowedTiers: z.array(z.enum(CHINNALLM_TIERS as [string, ...string[]])).max(24),
  maxProjects: z.number().int().min(-1).max(100000),
  backendMode: z.boolean(),
  customDomains: z.boolean(),
  byok: z.boolean(),
  monthlyGrant: z.number().int().min(0).max(10000000),
});

const bodySchema = z.object({
  free: limitsSchema,
  pro: limitsSchema,
  enterprise: limitsSchema,
});

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await rateLimitOrThrow(`admin-plan-config-save:${admin.id}`, { limit: 20, windowSeconds: 60 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid plan config" }, { status: 400 });
    }
    const config = parsed.data as PlanConfig;
    await savePlanConfig(config);
    await logAudit({
      userId: admin.id,
      action: "admin.plan_config.update",
      resource: "setting",
      resourceId: "plan_limits",
      metadata: { plans: PLAN_IDS },
    });
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
