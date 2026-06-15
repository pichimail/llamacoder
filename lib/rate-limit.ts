import "server-only";

export async function rateLimitOrThrow(
  key: string,
  options: { limit: number; windowSeconds: number },
) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: true, remaining: options.limit };

  const safeKey = `ratelimit:${key}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
  const endpoint = url.replace(/\/$/, "");

  const [countRes] = await Promise.all([
    fetch(`${endpoint}/incr/${encodeURIComponent(safeKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  if (!countRes.ok) return { ok: true, remaining: options.limit };
  const countJson = await countRes.json().catch(() => null);
  const count = Number(countJson?.result || 0);

  if (count === 1) {
    await fetch(`${endpoint}/expire/${encodeURIComponent(safeKey)}/${options.windowSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  if (count > options.limit) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  }

  return { ok: true, remaining: Math.max(0, options.limit - count) };
}
