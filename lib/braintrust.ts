import "server-only";

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
      project: "llamacoder",
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
  model: string;
  input: any;
  output: string;
  metadata?: Record<string, any>;
  scores?: Record<string, number>;
}) {
  const btLogger = getBraintrustLogger();
  if (!btLogger) return;

  try {
    btLogger.log({
      input: params.input,
      output: params.output,
      metadata: {
        chatId: params.chatId,
        model: params.model,
        ...params.metadata,
      },
      scores: params.scores || {},
    });
  } catch (e) {
    console.warn("Braintrust log failed:", e);
  }
}
