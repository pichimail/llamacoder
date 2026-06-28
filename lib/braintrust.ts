import "server-only";

import { recordGenerationLog } from "@/lib/generation-observability";

let logger: any = null;

export function getBraintrustLogger() {
  if (logger) return logger;
  if (!process.env.BRAINTRUST_API_KEY) {
    return null;
  }
  try {
    // Lazy require to avoid bundling issues if not present at build
    // @ts-ignore
    const { initLogger } = require("braintrust");
    logger = initLogger({
      project: process.env.BRAINTRUST_PROJECT_NAME || "llamacoder",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
    return logger;
  } catch (e) {
    console.warn("Braintrust init failed (optional):", e);
    return null;
  }
}

export function logGeneration(params: {
  chatId?: string;
  messageId?: string;
  model: string;
  provider?: string;
  input: any;
  output: string;
  metadata?: Record<string, any>;
  scores?: Record<string, number>;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}) {
  void recordGenerationLog({
    chatId: params.chatId,
    messageId: params.messageId,
    model: params.model,
    provider: params.provider,
    input: params.input,
    output: params.output,
    metadata: params.metadata,
    scores: params.scores,
    durationMs: params.durationMs,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    totalTokens: params.totalTokens,
  });

  const btLogger = getBraintrustLogger();
  if (!btLogger) return;

  try {
    btLogger.log({
      input: params.input,
      output: params.output,
      metadata: {
        chatId: params.chatId,
        messageId: params.messageId,
        model: params.model,
        provider: params.provider,
        braintrustProjectId: process.env.BRAINTRUST_PROJECT_ID,
        ...params.metadata,
      },
      scores: params.scores || {},
    });
  } catch (e) {
    console.warn("Braintrust log failed:", e);
  }
}
