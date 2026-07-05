import "server-only";

/**
 * Plan tier enforcement (Priority 2).
 *
 * Single source of truth for what each pricing plan (`free` | `pro` |
 * `enterprise`) may do server-side:
 *   - which ChinnaLLM model tiers it can invoke on platform credits
 *   - how many projects it can create
 *   - whether it can use backend mode, custom domains, and BYOK
 *   - its monthly credit grant
 *
 * Defaults live here; admins can override them live (no code deploy) via the
 * `plan_limits` Setting, edited from /admin/pricing. Nothing here trusts the
 * client — the plan is always read from the database.
 */
import { getPrisma } from "@/lib/prisma";
import { getSettings, setSetting } from "@/lib/settings";
import type { ChinnaLLMTier } from "@/lib/chinnallm/tiers";

export type PlanId = "free" | "pro" | "enterprise";
export const PLAN_IDS: PlanId[] = ["free", "pro", "enterprise"];

export type PlanLimits = {
  /** Model tiers this plan may invoke on platform credits. */
  allowedTiers: ChinnaLLMTier[];
  /** Max projects the user may own. -1 = unlimited. */
  maxProjects: number;
  /** May enable server/backend build mode. */
  backendMode: boolean;
  /** May attach custom domains to projects. */
  customDomains: boolean;
  /** May bring their own OpenRouter key (BYOK). */
  byok: boolean;
  /** Monthly credit grant (also honoured by the credit ledger reset). */
  monthlyGrant: number;
};

export type PlanConfig = Record<PlanId, PlanLimits>;

/** Tiers considered "free to serve" — always allowed regardless of plan. */
const ALWAYS_ALLOWED_TIERS: ChinnaLLMTier[] = ["free", "auto"];

export const DEFAULT_PLAN_LIMITS: PlanConfig = {
  free: {
    allowedTiers: ["free", "auto", "budget"],
    maxProjects: 5,
    backendMode: false,
    customDomains: false,
    byok: false,
    monthlyGrant: 100,
  },
  pro: {
    allowedTiers: ["free", "auto", "budget", "coding", "code", "reasoning", "vision", "image"],
    maxProjects: 100,
    backendMode: true,
    customDomains: true,
    byok: true,
    monthlyGrant: 1000,
  },
  enterprise: {
    allowedTiers: [
      "free",
      "auto",
      "budget",
      "coding",
      "code",
      "flagship",
      "reasoning",
      "vision",
      "image",
      "video",
      "music",
    ],
    maxProjects: -1,
    backendMode: true,
    customDomains: true,
    byok: true,
    monthlyGrant: 1000,
  },
};

export class PlanLimitError extends Error {
  status = 402;
  code: string;
  plan: PlanId;
  upgradeUrl = "/pricing";
  constructor(message: string, code: string, plan: PlanId) {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
    this.plan = plan;
  }
}

function normalizePlan(value: string | null | undefined): PlanId {
  return value === "pro" || value === "enterprise" ? value : "free";
}

function mergeLimits(base: PlanLimits, override: Partial<PlanLimits> | undefined): PlanLimits {
  if (!override) return base;
  return {
    allowedTiers: Array.isArray(override.allowedTiers) ? (override.allowedTiers as ChinnaLLMTier[]) : base.allowedTiers,
    maxProjects: typeof override.maxProjects === "number" ? override.maxProjects : base.maxProjects,
    backendMode: typeof override.backendMode === "boolean" ? override.backendMode : base.backendMode,
    customDomains: typeof override.customDomains === "boolean" ? override.customDomains : base.customDomains,
    byok: typeof override.byok === "boolean" ? override.byok : base.byok,
    monthlyGrant: typeof override.monthlyGrant === "number" ? override.monthlyGrant : base.monthlyGrant,
  };
}

/** Effective plan config = defaults merged with admin `plan_limits` override. */
export async function getPlanConfig(): Promise<PlanConfig> {
  try {
    const settings = await getSettings();
    const raw = settings.plan_limits;
    if (!raw) return DEFAULT_PLAN_LIMITS;
    const parsed = JSON.parse(raw) as Partial<Record<PlanId, Partial<PlanLimits>>>;
    return {
      free: mergeLimits(DEFAULT_PLAN_LIMITS.free, parsed.free),
      pro: mergeLimits(DEFAULT_PLAN_LIMITS.pro, parsed.pro),
      enterprise: mergeLimits(DEFAULT_PLAN_LIMITS.enterprise, parsed.enterprise),
    };
  } catch {
    return DEFAULT_PLAN_LIMITS;
  }
}

export async function savePlanConfig(config: PlanConfig): Promise<void> {
  await setSetting("plan_limits", JSON.stringify(config));
}

/** Resolve a user's effective plan (UserCredits.planTier is authoritative; falls back to User.plan). */
export async function getUserPlan(userId: string): Promise<PlanId> {
  const prisma = getPrisma();
  try {
    const credits = await prisma.userCredits.findUnique({ where: { userId }, select: { planTier: true } });
    if (credits?.planTier) return normalizePlan(credits.planTier);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    return normalizePlan(user?.plan);
  } catch {
    return "free";
  }
}

export async function getLimitsForUser(userId: string): Promise<{ plan: PlanId; limits: PlanLimits }> {
  const [plan, config] = await Promise.all([getUserPlan(userId), getPlanConfig()]);
  return { plan, limits: config[plan] };
}

/** Monthly grant for a plan, honouring admin overrides (used by the credit ledger). */
export async function getEffectiveMonthlyGrant(planTier: string): Promise<number> {
  const config = await getPlanConfig();
  return config[normalizePlan(planTier)].monthlyGrant;
}

export function isTierAllowed(limits: PlanLimits, tier: string): boolean {
  if ((ALWAYS_ALLOWED_TIERS as string[]).includes(tier)) return true;
  return (limits.allowedTiers as string[]).includes(tier);
}

/** Throw if the plan can't invoke this model tier. */
export async function assertTierAllowed(userId: string, tier: string): Promise<void> {
  const { plan, limits } = await getLimitsForUser(userId);
  if (!isTierAllowed(limits, tier)) {
    throw new PlanLimitError(
      `The ${tier} model tier isn't available on the ${plan} plan. Upgrade to unlock it.`,
      "tier_not_allowed",
      plan,
    );
  }
}

/** Throw if the user is at their project cap. */
export async function assertCanCreateProject(userId: string): Promise<void> {
  const { plan, limits } = await getLimitsForUser(userId);
  if (limits.maxProjects < 0) return; // unlimited
  const prisma = getPrisma();
  const count = await prisma.project.count({ where: { userId } });
  if (count >= limits.maxProjects) {
    throw new PlanLimitError(
      `You've reached the ${limits.maxProjects}-project limit on the ${plan} plan. Upgrade for more.`,
      "project_limit",
      plan,
    );
  }
}

export type PlanFeature = "backendMode" | "customDomains" | "byok";

export async function assertFeatureAllowed(userId: string, feature: PlanFeature): Promise<void> {
  const { plan, limits } = await getLimitsForUser(userId);
  if (!limits[feature]) {
    const label =
      feature === "backendMode" ? "Backend mode" : feature === "customDomains" ? "Custom domains" : "Bring-your-own-key";
    throw new PlanLimitError(
      `${label} isn't available on the ${plan} plan. Upgrade to enable it.`,
      `${feature}_not_allowed`,
      plan,
    );
  }
}

export function planErrorResponseBody(error: PlanLimitError) {
  return { error: error.message, code: error.code, plan: error.plan, upgradeUrl: error.upgradeUrl };
}
