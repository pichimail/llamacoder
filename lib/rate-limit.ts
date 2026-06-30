import "server-only";

import { getPrisma } from "@/lib/prisma";

function getUpstashRestConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.KV_REST_API_READ_ONLY_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.KV_REST_API_READ_ONLY_TOKEN;

  return { url, token };
}

export function isRateLimitConfigured() {
  const { url, token } = getUpstashRestConfig();
  return Boolean(url && token);
}

const DISABLED = process.env.RATE_LIMIT_DISABLED === "true";

async function checkPrismaRateLimit(userKey: string, routeKey: string, limit: number, windowSeconds: number) {
  const prisma = getPrisma();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const key = `${userKey}:${routeKey}`;
  // Clean old
  await prisma.rateLimit.deleteMany({
    where: { updatedAt: { lt: windowStart } },
  }).catch(() => undefined);

  // Simplified window: use a rolling count via upsert approx
  const windowBucket = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * (windowSeconds * 1000));

  let record = await prisma.rateLimit.findUnique({
    where: { userId_route_windowStart: { userId: key, route: routeKey, windowStart: windowBucket } },
  });

  if (!record) {
    record = await prisma.rateLimit.create({
      data: {
        userId: key,
        route: routeKey,
        count: 1,
        windowStart: windowBucket,
      },
    });
  } else {
    record = await prisma.rateLimit.update({
      where: { id: record.id },
      data: { count: { increment: 1 }, updatedAt: now },
    });
  }

  if (record.count > limit) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  }
  return { ok: true, remaining: Math.max(0, limit - record.count) };
}

export async function rateLimitOrThrow(
  key: string,
  options: { limit: number; windowSeconds: number },
) {
  if (DISABLED) {
    return { ok: true, remaining: options.limit };
  }

  const { url, token } = getUpstashRestConfig();
  const safeRoute = key.split(":")[0] || "default";

  if (url && token) {
    const safeKey = `ratelimit:${key}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
    const endpoint = url.replace(/\/$/, "");
    const authHeaders = { Authorization: `Bearer ${token}` };

    const countRes = await fetch(`${endpoint}/incr/${encodeURIComponent(safeKey)}`, {
      headers: authHeaders,
      cache: "no-store",
    });

    if (!countRes.ok) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Rate limit service unavailable. Please try again shortly.");
      }
      // In non-prod, fall to prisma
    } else {
      const countJson = await countRes.json().catch(() => null);
      const count = Number(countJson?.result || 0);

      if (count === 1) {
        await fetch(`${endpoint}/expire/${encodeURIComponent(safeKey)}/${options.windowSeconds}`, {
          headers: authHeaders,
          cache: "no-store",
        }).catch(() => undefined);
      }

      if (count > options.limit) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      return { ok: true, remaining: Math.max(0, options.limit - count) };
    }
  }

  // Fallback to Prisma (always available if DB_URL)
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production" && !DISABLED) {
      throw new Error("Rate limit storage unavailable in production");
    }
    return { ok: true, remaining: options.limit };
  }

  try {
    const userKey = key.includes(":") ? key.split(":").slice(1).join(":") : key;
    return await checkPrismaRateLimit(userKey || "anon", safeRoute, options.limit, options.windowSeconds);
  } catch (e: any) {
    if (e.message && /Rate limit exceeded/.test(e.message)) {
      throw e;
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Rate limit check failed");
    }
    return { ok: true, remaining: options.limit };
  }
}
