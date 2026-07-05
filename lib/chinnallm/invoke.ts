/** ChinnaLLM invocation engine (Phase 2).
 * Wraps OpenRouter behind the ChinnaLLM brand: resolves models by id/tier,
 * enforces credits (skipped for BYOK), streams, logs usage, and falls back
 * within a tier on provider failure. "OpenRouter" never leaves this layer.
 */
import { getPrisma } from "@/lib/prisma";
import type { ChinnaLLMModel } from "@prisma/client";
import { getModelById, getModelsByTier, isChinnaLLMTier, type ChinnaLLMTier } from "./models";
import { CreditExhaustedError, deductCredits, estimateCredits, getBalance, refundCredits } from "./credits";
import { assertTierAllowed } from "@/lib/plan";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const INVOKE_TIMEOUT_MS = 120_000;

export class ConfigurationError extends Error {
  constructor(message = "ChinnaLLM is not configured. Contact the administrator.") {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ChinnaLLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "ChinnaLLMError";
    this.status = status;
  }
}

export type ChinnaLLMMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export type InvokeParams = {
  userId: string;
  chatId?: string;
  modelId?: string;
  tier?: string;
  messages: ChinnaLLMMessage[];
  byokKey?: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export type ChinnaLLMResponse = {
  model: string; // displayName only — never the provider id
  tier: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
  latencyMs: number;
};

function estimateTokens(messages: ChinnaLLMMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length), 0);
  return Math.max(Math.ceil(chars / 4), 1);
}

async function logUsage(entry: {
  userId: string; chatId?: string; modelId: string;
  inputTokens?: number; outputTokens?: number; creditsUsed?: number;
  isByok?: boolean; latencyMs?: number; error?: string;
}) {
  try {
    const prisma = getPrisma();
    await prisma.chinnaLLMUsage.create({
      data: {
        userId: entry.userId,
        chatId: entry.chatId ?? null,
        modelId: entry.modelId,
        inputTokens: entry.inputTokens ?? 0,
        outputTokens: entry.outputTokens ?? 0,
        creditsUsed: entry.creditsUsed ?? 0,
        isByok: entry.isByok ?? false,
        latencyMs: entry.latencyMs ?? null,
        error: entry.error ?? null,
      },
    });
  } catch {
    // Usage logging must never break the invocation path.
  }
}

async function resolveCandidates(params: InvokeParams): Promise<ChinnaLLMModel[]> {
  if (params.modelId) {
    const model = await getModelById(params.modelId);
    if (!model || !model.enabled) throw new ChinnaLLMError("Requested ChinnaLLM model is unavailable.", 404);
    // Fallbacks: rest of the same tier after the explicit choice.
    const tierMates = (await getModelsByTier(model.tier)).filter((m) => m.id !== model.id);
    return [model, ...tierMates];
  }
  const tier: ChinnaLLMTier = isChinnaLLMTier(params.tier) ? params.tier : "auto";
  const models = await getModelsByTier(tier);
  if (models.length === 0) throw new ChinnaLLMError(`No ChinnaLLM models available for tier "${tier}".`, 404);
  return models;
}

function mapProviderError(status: number, _detail = "") {
  if (status === 401 || status === 403) return "ChinnaLLM credentials are not authorized. Check the configured key.";
  if (status === 408 || status === 504) return "ChinnaLLM timed out while generating. Try a smaller request.";
  if (status === 429) return "ChinnaLLM is temporarily rate limited. Trying the fallback model.";
  if (status >= 500) return "ChinnaLLM provider capacity is temporarily unavailable. Trying the fallback model.";
  return "ChinnaLLM could not complete this request. Please revise the prompt and retry.";
}

function safeErrorMessage(error: unknown) {
  if (error instanceof CreditExhaustedError) return error.message;
  if (error instanceof ConfigurationError) return error.message;
  if (error instanceof ChinnaLLMError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "ChinnaLLM request timed out.";
  return "ChinnaLLM request failed.";
}

function creditsForUsage(model: ChinnaLLMModel, inputTokens: number, outputTokens: number): number {
  if (model.costPerKTokens === 0) return 0;
  const kTokens = (inputTokens + outputTokens) / 1000;
  return Math.max(Math.ceil(kTokens * model.costPerKTokens), 1);
}

async function callProvider(model: ChinnaLLMModel, params: InvokeParams, apiKey: string, signal: AbortSignal) {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000",
      "X-Title": "ChinnaLLM",
    },
    body: JSON.stringify({
      model: model.openRouterId,
      messages: params.messages,
      stream: params.stream === true,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
    }),
    signal,
  });
}

export async function invokeChinnaLLM(params: InvokeParams): Promise<ChinnaLLMResponse | ReadableStream<Uint8Array>> {
  const candidates = await resolveCandidates(params);
  const primary = candidates[0];
  const isByok = Boolean(params.byokKey);

  // Priority 2: plan tier enforcement. Platform-credit calls must be within the
  // user's plan (a free user can't invoke flagship). BYOK pays their own key,
  // so tier gating is skipped there (BYOK availability itself is gated upstream).
  if (!isByok) {
    await assertTierAllowed(params.userId, primary.tier);
  }

  const estimatedInputTokens = estimateTokens(params.messages);
  let reservedCredits = 0;
  let reconciled = false;

  // 2. Strict credit reservation (skipped for BYOK). This makes streaming atomic enough
  // for production: credits are held before output leaves the server, then reconciled.
  if (!isByok) {
    reservedCredits = estimateCredits(primary.tier, Math.max(estimatedInputTokens / 1000, 0.25));
    const { balance } = await getBalance(params.userId);
    if (balance < reservedCredits) throw new CreditExhaustedError(balance, reservedCredits);
    if (reservedCredits > 0) {
      await deductCredits(params.userId, reservedCredits, `ChinnaLLM reservation: ${primary.displayName}`, params.chatId);
    }
  }

  async function reconcileCredits(actualCredits: number, reason: string) {
    if (isByok || reconciled) return 0;
    reconciled = true;
    if (actualCredits > reservedCredits) {
      await deductCredits(params.userId, actualCredits - reservedCredits, `${reason} additional usage`, params.chatId);
    } else if (actualCredits < reservedCredits) {
      await refundCredits(params.userId, reservedCredits - actualCredits, `${reason} unused reservation`, params.chatId);
    }
    return actualCredits;
  }

  async function refundReservation(reason: string) {
    if (!isByok && !reconciled && reservedCredits > 0) {
      reconciled = true;
      await refundCredits(params.userId, reservedCredits, reason, params.chatId).catch(() => undefined);
    }
  }

  // 3. Key resolution.
  const apiKey = params.byokKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    await refundReservation("ChinnaLLM configuration failure");
    throw new ConfigurationError();
  }

  let lastError: Error | null = null;

  for (const model of candidates) {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);
    try {
      const response = await callProvider(model, params, apiKey, controller.signal);
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new ChinnaLLMError(mapProviderError(response.status, detail), response.status === 429 ? 429 : 502);
      }

      if (params.stream && response.body) {
        const reader = response.body.getReader();
        let outputChars = 0;
        const userId = params.userId;
        const chatId = params.chatId;
        const inputTokens = estimatedInputTokens;
        const streamOut = new ReadableStream<Uint8Array>({
          async pull(controllerOut) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                clearTimeout(timeout);
                const outputTokens = Math.max(Math.ceil(outputChars / 4), 1);
                const actualCredits = isByok ? 0 : creditsForUsage(model, inputTokens, outputTokens);
                const creditsUsed = await reconcileCredits(actualCredits, `ChinnaLLM ${model.displayName}`);
                await logUsage({ userId, chatId, modelId: model.id, inputTokens, outputTokens, creditsUsed, isByok, latencyMs: Date.now() - started });
                controllerOut.close();
                return;
              }
              outputChars += value?.byteLength ?? 0;
              controllerOut.enqueue(value);
            } catch (error) {
              clearTimeout(timeout);
              const outputTokens = Math.max(Math.ceil(outputChars / 4), 1);
              const actualCredits = isByok ? 0 : creditsForUsage(model, inputTokens, outputTokens);
              const creditsUsed = await reconcileCredits(actualCredits, `ChinnaLLM ${model.displayName} partial stream`).catch(() => actualCredits);
              await logUsage({ userId, chatId, modelId: model.id, inputTokens, outputTokens, creditsUsed, isByok, latencyMs: Date.now() - started, error: safeErrorMessage(error) });
              controllerOut.error(new ChinnaLLMError("ChinnaLLM stream ended before completion. Partial output may be incomplete.", 502));
            }
          },
          cancel() {
            clearTimeout(timeout);
            void reader.cancel().catch(() => undefined);
          },
        });
        return streamOut;
      }

      const json: any = await response.json();
      clearTimeout(timeout);
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const inputTokens: number = json?.usage?.prompt_tokens ?? estimatedInputTokens;
      const outputTokens: number = json?.usage?.completion_tokens ?? Math.max(Math.ceil(content.length / 4), 1);
      const actualCredits = isByok ? 0 : creditsForUsage(model, inputTokens, outputTokens);
      const creditsUsed = await reconcileCredits(actualCredits, `ChinnaLLM ${model.displayName}`);
      const latencyMs = Date.now() - started;

      await logUsage({ userId: params.userId, chatId: params.chatId, modelId: model.id, inputTokens, outputTokens, creditsUsed, isByok, latencyMs });

      return { model: model.displayName, tier: model.tier, content, inputTokens, outputTokens, creditsUsed, latencyMs };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof CreditExhaustedError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      await logUsage({ userId: params.userId, chatId: params.chatId, modelId: model.id, isByok, latencyMs: Date.now() - started, error: safeErrorMessage(error) });
      continue;
    }
  }

  await refundReservation("ChinnaLLM failed before completion");
  throw lastError instanceof ChinnaLLMError ? lastError : new ChinnaLLMError("All ChinnaLLM models failed for this request.", 502);
}
