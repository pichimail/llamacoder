import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { decrypt } from "@/lib/chinnallm/encryption";
import { SDK_MODEL_ALIAS_TO_TIER } from "@/lib/chinnallm/sdk-template";
import { getBYOKProvider, type BYOKProviderId } from "@/lib/chinnallm/provider-catalog";
import {
  invokeChinnaLLM,
  ChinnaLLMError,
  ConfigurationError,
  type ChinnaLLMMessage,
} from "@/lib/chinnallm/invoke";
import { CreditExhaustedError } from "@/lib/chinnallm/credits";
import { assertFeatureAllowed, PlanLimitError, planErrorResponseBody } from "@/lib/plan";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([
    z.string().min(1).max(200000),
    z.array(z.union([
      z.object({ type: z.literal("text"), text: z.string().max(200000) }),
      z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string().url() }) }),
    ])).min(1),
  ]),
});

const invokeSchema = z.object({
  // SDK-style shorthand
  action: z.enum(["text", "vision", "code", "image"]).optional(),
  prompt: z.string().max(200000).optional(),
  imageUrl: z.string().url().optional(),
  language: z.string().max(40).optional(),
  model: z.string().max(40).optional(), // friendly alias like "pro" | "code"
  // Full form
  messages: z.array(messageSchema).max(64).optional(),
  modelId: z.string().max(64).optional(),
  tier: z.string().max(24).optional(),
  chatId: z.string().max(64).optional(),
  useByok: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

function toMessages(body: z.infer<typeof invokeSchema>): ChinnaLLMMessage[] {
  if (body.messages && body.messages.length > 0) return body.messages as ChinnaLLMMessage[];
  const prompt = body.prompt?.trim();
  if (!prompt) return [];
  if (body.action === "vision" && body.imageUrl) {
    return [{ role: "user", content: [{ type: "image_url", image_url: { url: body.imageUrl } }, { type: "text", text: prompt }] }];
  }
  if (body.action === "code") {
    return [
      { role: "system", content: `You are ChinnaLLM Code. Respond with clean, complete ${body.language || "typescript"} code.` },
      { role: "user", content: prompt },
    ];
  }
  return [{ role: "user", content: prompt }];
}

function resolveTier(body: z.infer<typeof invokeSchema>): string | undefined {
  if (body.tier) return body.tier;
  if (body.model && SDK_MODEL_ALIAS_TO_TIER[body.model]) return SDK_MODEL_ALIAS_TO_TIER[body.model];
  if (body.action === "vision") return "vision";
  if (body.action === "code") return "coding";
  if (body.action === "image") return "image";
  if (body.action === "text") return "free";
  return "free";
}

function flattenMessages(messages: ChinnaLLMMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === "string"
      ? message.content
      : message.content.map((part) => part.type === "text" ? part.text : `[image: ${part.image_url.url}]`).join("\n"),
  }));
}

async function invokeDirectByokProvider(params: {
  providerId: BYOKProviderId;
  key: string;
  messages: ChinnaLLMMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  const provider = getBYOKProvider(params.providerId);
  const started = Date.now();
  const textMessages = flattenMessages(params.messages);
  const maxTokens = params.maxTokens ?? 1024;
  const temperature = params.temperature ?? 0.7;

  async function openAICompatible(url: string, model = provider.defaultModel) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: textMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ChinnaLLMError(json?.error?.message || `${provider.label} request failed.`, response.status);
    }
    return {
      content: json?.choices?.[0]?.message?.content ?? "",
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
    };
  }

  let result: { content: string; inputTokens?: number; outputTokens?: number };
  if (provider.id === "anthropic") {
    const system = textMessages.find((message) => message.role === "system")?.content;
    const messages = textMessages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": params.key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.defaultModel,
        system,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ChinnaLLMError(json?.error?.message || `${provider.label} request failed.`, response.status);
    }
    result = {
      content: Array.isArray(json?.content)
        ? json.content.map((part: any) => part?.text || "").join("")
        : "",
      inputTokens: json?.usage?.input_tokens,
      outputTokens: json?.usage?.output_tokens,
    };
  } else if (provider.id === "google") {
    const prompt = textMessages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${provider.defaultModel}:generateContent?key=${encodeURIComponent(params.key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      },
    );
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ChinnaLLMError(json?.error?.message || `${provider.label} request failed.`, response.status);
    }
    result = {
      content: json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("") ?? "",
      inputTokens: json?.usageMetadata?.promptTokenCount,
      outputTokens: json?.usageMetadata?.candidatesTokenCount,
    };
  } else {
    const urls: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      xai: "https://api.x.ai/v1/chat/completions",
      together: "https://api.together.xyz/v1/chat/completions",
      nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
    };
    result = await openAICompatible(urls[provider.id] ?? urls.openai);
  }

  const content = result.content || "";
  return {
    model: provider.shortName,
    tier: "byok",
    content,
    inputTokens: result.inputTokens ?? Math.max(Math.ceil(JSON.stringify(textMessages).length / 4), 1),
    outputTokens: result.outputTokens ?? Math.max(Math.ceil(content.length / 4), 1),
    creditsUsed: 0,
    latencyMs: Date.now() - started,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-invoke:${user.id}`, { limit: 30, windowSeconds: 60 });

    const json = await request.json().catch(() => null);
    const parsed = invokeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }
    const body = parsed.data;

    const messages = toMessages(body);
    if (messages.length === 0) {
      return NextResponse.json({ error: "Provide `prompt` or `messages`." }, { status: 400 });
    }

    // BYOK: decrypt the user's stored key server-side; the key never round-trips.
    let byokKey: string | undefined;
    let byokProvider: BYOKProviderId | undefined;
    if (body.useByok) {
      await assertFeatureAllowed(user.id, "byok");
      const prisma = getPrisma();
      const stored = await prisma.apiKeyStore.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });
      if (!stored) return NextResponse.json({ error: "No BYOK key stored. Add one in Settings → API Keys." }, { status: 400 });
      byokKey = decrypt(stored.encryptedKey, stored.iv);
      byokProvider = getBYOKProvider(stored.provider).id;
      if (byokProvider !== "openrouter") {
        if (body.stream) {
          return NextResponse.json({ error: "Streaming BYOK is currently available through OpenRouter keys only." }, { status: 400 });
        }
        const byokResult = await invokeDirectByokProvider({
          providerId: byokProvider,
          key: byokKey,
          messages,
          maxTokens: body.maxTokens,
          temperature: body.temperature,
        });
        return NextResponse.json(byokResult);
      }
    }

    const result = await invokeChinnaLLM({
      userId: user.id,
      chatId: body.chatId,
      modelId: body.modelId,
      tier: resolveTier(body),
      messages,
      byokKey,
      stream: body.stream,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    });

    if (result instanceof ReadableStream) {
      return new Response(result, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(planErrorResponseBody(error), { status: error.status });
    }
    if (error instanceof CreditExhaustedError) {
      return NextResponse.json({ error: error.message, balance: error.balance, needed: error.needed, upgradeUrl: error.upgradeUrl }, { status: 402 });
    }
    if (error instanceof ConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof ChinnaLLMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "ChinnaLLM invocation failed. Please retry or choose another model tier." }, { status: 500 });
  }
}
