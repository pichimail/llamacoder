import "server-only";

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

export async function rateLimitOrThrow(
  key: string,
  options: { limit: number; windowSeconds: number },
) {
  const { url, token } = getUpstashRestConfig();

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN.");
    }
    return { ok: true, remaining: options.limit };
  }

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
    return { ok: true, remaining: options.limit };
  }

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
