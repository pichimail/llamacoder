import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { BYOK_PROVIDER_IDS, getBYOKProvider } from "@/lib/chinnallm/provider-catalog";

const testSchema = z.object({
  provider: z.enum(BYOK_PROVIDER_IDS),
  key: z.string().min(8).max(400),
});

const TEST_TIMEOUT_MS = 12_000;

async function providerFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function testProviderKey(providerId: string, key: string) {
  const provider = getBYOKProvider(providerId);

  if (provider.id === "google") {
    const response = await providerFetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET", cache: "no-store" },
    );
    return { response, providerName: provider.label };
  }

  if (provider.id === "anthropic") {
    const response = await providerFetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    });
    return { response, providerName: provider.label };
  }

  const modelUrls: Record<string, string> = {
    openrouter: "https://openrouter.ai/api/v1/models",
    openai: "https://api.openai.com/v1/models",
    xai: "https://api.x.ai/v1/models",
    together: "https://api.together.xyz/v1/models",
    nvidia: "https://integrate.api.nvidia.com/v1/models",
  };

  const response = await providerFetch(modelUrls[provider.id] ?? modelUrls.openrouter, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return { response, providerName: provider.label };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-byok-test:${user.id}`, { limit: 12, windowSeconds: 60 });

    const parsed = testSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 },
      );
    }

    const { provider, key } = parsed.data;
    const { response, providerName } = await testProviderKey(provider, key.trim());
    const text = await response.text().catch(() => "");

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          provider,
          message: `${providerName} rejected the key (${response.status}).`,
          detail: text.slice(0, 240),
        },
        { status: response.status === 401 || response.status === 403 ? 401 : 400 },
      );
    }

    let modelCount: number | undefined;
    try {
      const json = JSON.parse(text);
      const models = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : undefined;
      modelCount = models?.length;
    } catch {
      modelCount = undefined;
    }

    return NextResponse.json({
      ok: true,
      provider,
      message: `${providerName} key is working.`,
      modelCount,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "Provider key test timed out."
      : "Could not test this API key.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
