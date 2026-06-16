import "server-only";

import Together from "together-ai";
import {
  getFallbackModel,
  getModelConfig,
  resolveNativeModel,
  type ModelConfig,
} from "@/lib/constants";

type ChatRole = "system" | "user" | "assistant";

export type GenerationMessage = {
  role: ChatRole;
  content: string | Array<Record<string, unknown>>;
};

export type TextGenerationResult = {
  content: string;
  model: string;
  provider: string;
};

function getTogetherClient() {
  const options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "HyperSpeed",
    };
  }
  return new Together(options);
}

export function providerConfigured(config: ModelConfig) {
  if (config.provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  return Boolean(process.env.TOGETHER_API_KEY);
}

export function anyProviderConfigured() {
  return Boolean(process.env.TOGETHER_API_KEY || process.env.OPENROUTER_API_KEY);
}

export function providerMissingMessage(config: ModelConfig) {
  if (config.provider === "openrouter") return "Missing OPENROUTER_API_KEY";
  return "Missing TOGETHER_API_KEY";
}

function openRouterHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "HyperSpeed";
  return headers;
}

function normalizeMessages(messages: GenerationMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export async function createChatTextCompletion({
  model,
  messages,
  temperature = 0.3,
  maxTokens = 1000,
}: {
  model: string;
  messages: GenerationMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<TextGenerationResult> {
  const config = getModelConfig(model);
  if (!providerConfigured(config)) throw new Error(providerMissingMessage(config));

  if (config.provider === "openrouter") {
    const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: resolveNativeModel(model),
        messages: normalizeMessages(messages),
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const json = await response.json();
    return {
      content: json?.choices?.[0]?.message?.content || "",
      model: resolveNativeModel(model),
      provider: "openrouter",
    };
  }

  const together = getTogetherClient();
  const response = await together.chat.completions.create({
    model: resolveNativeModel(model),
    messages: normalizeMessages(messages) as any,
    temperature,
    max_tokens: maxTokens,
  });
  return {
    content: response.choices?.[0]?.message?.content || "",
    model: resolveNativeModel(model),
    provider: "together",
  };
}

export async function createChatStream({
  model,
  messages,
  temperature = 0.4,
  maxTokens = 9000,
  reasoningEnabled = false,
}: {
  model: string;
  messages: GenerationMessage[];
  temperature?: number;
  maxTokens?: number;
  reasoningEnabled?: boolean;
}): Promise<{ stream: ReadableStream; model: string; provider: string }> {
  const config = getModelConfig(model);
  if (!providerConfigured(config)) throw new Error(providerMissingMessage(config));

  if (config.provider === "openrouter") {
    const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: resolveNativeModel(model),
        messages: normalizeMessages(messages),
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok || !response.body) throw new Error(await response.text());
    return { stream: response.body, model: resolveNativeModel(model), provider: "openrouter" };
  }

  const together = getTogetherClient();
  const response = await together.chat.completions.create({
    model: resolveNativeModel(model),
    reasoning: { enabled: reasoningEnabled },
    messages: normalizeMessages(messages) as any,
    stream: true,
    temperature,
    max_tokens: maxTokens,
  });
  return { stream: response.toReadableStream(), model: resolveNativeModel(model), provider: "together" };
}

export async function createChatStreamWithFallback(args: {
  model: string;
  messages: GenerationMessage[];
  temperature?: number;
  maxTokens?: number;
  reasoningEnabled?: boolean;
}) {
  try {
    return await createChatStream(args);
  } catch (primaryError) {
    const fallback = getFallbackModel();
    if (fallback.value === args.model) throw primaryError;
    if (!providerConfigured(fallback)) throw primaryError;

    const fallbackMessages: GenerationMessage[] = [
      ...args.messages,
      {
        role: "system",
        content:
          "The requested model failed before streaming. Continue with the stable fallback model. Return working complete files. Fix missing imports, invalid exports, and dependency issues proactively.",
      },
    ];

    return createChatStream({
      ...args,
      model: fallback.value,
      messages: fallbackMessages,
    });
  }
}

export async function createTextWithFallback(args: {
  model: string;
  messages: GenerationMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    return await createChatTextCompletion(args);
  } catch (primaryError) {
    const fallback = getFallbackModel();
    if (fallback.value === args.model || !providerConfigured(fallback)) throw primaryError;
    return createChatTextCompletion({ ...args, model: fallback.value });
  }
}
