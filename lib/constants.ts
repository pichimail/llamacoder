export type ModelProvider = "together" | "openrouter";

export type ModelConfig = {
  label: string;
  value: string;
  provider: ModelProvider;
  nativeModel: string;
  hidden?: boolean;
  recommended?: boolean;
  status?: "ready" | "fallback" | "experimental" | "needs_key";
  description?: string;
  /** Maximum completion tokens this model can safely be asked for in one call.
   * Falls back to DEFAULT_MAX_OUTPUT_TOKENS when not set. Verify against the
   * provider's current docs before raising further — requesting more than a
   * model actually supports causes the provider to reject the call outright. */
  maxOutputTokens?: number;
};

/** Conservative default output ceiling used for any model without an explicit
 * override below. Generation code should never hardcode a token number itself;
 * always resolve it through getMaxOutputTokensForModel(). */
export const DEFAULT_MAX_OUTPUT_TOKENS = 16000;

export const WORKING_FALLBACK_MODEL = "zai-org/GLM-5.1";

export const MODEL_ALIASES: Record<string, string> = {
  "zai-org/GLM-4.6": "zai-org/GLM-5.1",
  "Qwen/Qwen2.5-Coder-32B-Instruct": "zai-org/GLM-5.1",
  "MiniMaxAI/MiniMax-M2.5": "MiniMaxAI/MiniMax-M2.7",
  "openrouter/free": "openrouter/openrouter/free",
  "openrouter-auto": "openrouter/auto",
  "sakana/fugu": "openrouter/sakana/fugu-ultra",
  "sakana/fugu-ultra": "openrouter/sakana/fugu-ultra",
  "glm-5": "zai-org/GLM-5",
  "glm-5.1": "zai-org/GLM-5.1",
  "glm-5.2": "zai-org/GLM-5.2",
};

export const MODELS: ModelConfig[] = [
  {
    label: "GLM 5",
    value: "zai-org/GLM-5",
    nativeModel: "zai-org/GLM-5",
    provider: "together",
    status: "ready",
    recommended: true,
    description: "Working builder model",
  },
  {
    label: "GLM 5.1",
    value: "zai-org/GLM-5.1",
    nativeModel: "zai-org/GLM-5.1",
    provider: "together",
    status: "ready",
    recommended: true,
    description: "Primary fallback model",
  },
  {
    label: "GLM 5.2",
    value: "zai-org/GLM-5.2",
    nativeModel: "zai-org/GLM-5.2",
    provider: "together",
    status: "ready",
    recommended: true,
    description: "Newest GLM builder model",
  },
  {
    label: "OpenRouter Auto",
    value: "openrouter/auto",
    nativeModel: "openrouter/auto",
    provider: "openrouter",
    status: "fallback",
    recommended: true,
    description: "Runtime-routed OpenRouter model",
  },
  {
    label: "OpenRouter Free",
    value: "openrouter/openrouter/free",
    nativeModel: "openrouter/free",
    provider: "openrouter",
    status: "fallback",
    recommended: true,
    description: "OpenRouter free-route default for lightweight builds",
    maxOutputTokens: 8192,
  },
  {
    label: "OpenRouter Fusion",
    value: "openrouter/openrouter/fusion",
    nativeModel: "openrouter/fusion",
    provider: "openrouter",
    status: "experimental",
    description: "OpenRouter multi-model fusion route",
  },
  {
    label: "Sakana Fugu Ultra",
    value: "openrouter/sakana/fugu-ultra",
    nativeModel: "sakana/fugu-ultra",
    provider: "openrouter",
    status: "experimental",
    recommended: true,
    description: "Sakana AI Fugu Ultra via OpenRouter",
  },
  {
    label: "Claude Sonnet 5",
    value: "openrouter/anthropic/claude-sonnet-5",
    nativeModel: "anthropic/claude-sonnet-5",
    provider: "openrouter",
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "Claude Sonnet 4.5",
    value: "openrouter/anthropic/claude-sonnet-4.5",
    nativeModel: "anthropic/claude-sonnet-4.5",
    provider: "openrouter",
    hidden: true,
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "DeepSeek V4 Pro",
    value: "openrouter/deepseek/deepseek-v4-pro",
    nativeModel: "deepseek/deepseek-v4-pro",
    provider: "openrouter",
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "DeepSeek V3.2",
    value: "openrouter/deepseek/deepseek-v3.2",
    nativeModel: "deepseek/deepseek-v3.2",
    provider: "openrouter",
    hidden: true,
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "Qwen Coder",
    value: "openrouter/qwen/qwen3-coder",
    nativeModel: "qwen/qwen3-coder",
    provider: "openrouter",
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "Kimi K2.7 Code",
    value: "openrouter/moonshotai/kimi-k2.7-code",
    nativeModel: "moonshotai/kimi-k2.7-code",
    provider: "openrouter",
    status: "experimental",
    description: "Moonshot Kimi coding model via OpenRouter",
  },
  {
    label: "MiniMax M3",
    value: "openrouter/minimax/minimax-m3",
    nativeModel: "minimax/minimax-m3",
    provider: "openrouter",
    status: "experimental",
    description: "Latest MiniMax model via OpenRouter",
  },
  {
    label: "MiniMax M2.7",
    value: "MiniMaxAI/MiniMax-M2.7",
    nativeModel: "MiniMaxAI/MiniMax-M2.7",
    provider: "together",
    status: "experimental",
  },
  {
    label: "MiniMax M2.5",
    value: "MiniMaxAI/MiniMax-M2.5",
    nativeModel: "MiniMaxAI/MiniMax-M2.5",
    provider: "together",
    hidden: true,
  },
  {
    label: "Qwen 3 Coder 480B",
    value: "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
    nativeModel: "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
    provider: "together",
    status: "experimental",
  },
  {
    label: "Qwen 3 Coder Next",
    value: "Qwen/Qwen3-Coder-Next-FP8",
    nativeModel: "Qwen/Qwen3-Coder-Next-FP8",
    provider: "together",
    status: "experimental",
  },
  {
    label: "DeepSeek V3",
    value: "deepseek-ai/DeepSeek-V3",
    nativeModel: "deepseek-ai/DeepSeek-V3",
    provider: "together",
    hidden: true,
  },
  {
    label: "Qwen 3 235B",
    value: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    nativeModel: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    provider: "together",
    hidden: true,
  },
  {
    label: "Llama 3.3 70B",
    value: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    nativeModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    provider: "together",
    hidden: true,
  },
];

export function resolveModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

/** Resolves the safe max-completion-tokens ceiling for a given model value.
 * Always route generation calls through this instead of a hardcoded number,
 * so raising limits for one model can never silently overshoot another's
 * real capacity. */
export function getMaxOutputTokensForModel(modelValue: string): number {
  const resolved = resolveModel(modelValue);
  const config = MODELS.find((m) => m.value === resolved || m.value === modelValue);
  return config?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
}

export function getModelConfig(model: string): ModelConfig {
  const resolved = resolveModel(model);
  return (
    MODELS.find((entry) => entry.value === resolved || entry.nativeModel === resolved) ??
    (resolved.startsWith("openrouter/")
      ? {
          label: resolved.replace("openrouter/", ""),
          value: resolved,
          nativeModel: resolved.replace("openrouter/", ""),
          provider: "openrouter" as const,
          status: "experimental" as const,
        }
      : {
          label: resolved,
          value: resolved,
          nativeModel: resolved,
          provider: "together" as const,
          status: "experimental" as const,
        })
  );
}

export function getProviderForModel(model: string): ModelProvider {
  return getModelConfig(model).provider;
}

export function resolveNativeModel(model: string): string {
  return getModelConfig(model).nativeModel;
}

export function getFallbackModel(): ModelConfig {
  if (process.env.OPENROUTER_API_KEY && !process.env.TOGETHER_API_KEY) {
    return getModelConfig("openrouter/auto");
  }
  if (process.env.TOGETHER_API_KEY) {
    return getModelConfig(WORKING_FALLBACK_MODEL);
  }
  return getModelConfig("openrouter/auto");
}

export function getHistoryCompressionModel(): string {
  if (process.env.TOGETHER_API_KEY) {
    return "zai-org/GLM-5";
  }
  if (process.env.OPENROUTER_API_KEY) {
    return "openrouter/auto";
  }
  return "zai-org/GLM-5";
}

export function getFinetunedModelConfig(): ModelConfig | null {
  const id =
    process.env.NEXT_PUBLIC_FINETUNED_MODEL_ID || process.env.FINETUNED_MODEL_ID;
  if (!id?.trim()) return null;

  return {
    label: "Chinna Coder (fine-tuned)",
    value: id.trim(),
    nativeModel: id.trim(),
    provider: "together",
    status: "experimental",
    description: "Fine-tuned on exported high-quality generations",
  };
}

export function getVisibleModels() {
  const finetuned = getFinetunedModelConfig();
  return [
    ...MODELS.filter((model) => !model.hidden),
    ...(finetuned ? [finetuned] : []),
  ];
}

export function assertValidModel(model: string | undefined | null): string {
  if (!model || typeof model !== "string") {
    throw new Error("Model is required");
  }
  const resolved = resolveModel(model);
  const visible = getVisibleModels();
  const match = visible.find(
    (m) => m.value === resolved || m.nativeModel === resolved || m.value === model,
  );
  if (!match) {
    // Only allow openrouter/* if it's explicitly present or dev, else reject unknown
    if (resolved.startsWith("openrouter/") && visible.some(v => v.provider === "openrouter")) {
      return resolved;
    }
    throw new Error(`Unknown or unsupported model: ${model}`);
  }
  return resolved;
}

export function getDefaultAvailableModel(): string {
  const togetherKey = process.env.TOGETHER_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (togetherKey) {
    return WORKING_FALLBACK_MODEL;
  }
  if (openrouterKey) {
    return "openrouter/auto";
  }
  // safe default that will be rejected later if no keys
  return WORKING_FALLBACK_MODEL;
}

export function isModelAvailable(model: string): boolean {
  try {
    const resolved = assertValidModel(model);
    const config = getModelConfig(resolved);
    if (config.provider === "together" && !process.env.TOGETHER_API_KEY) return false;
    if (config.provider === "openrouter" && !process.env.OPENROUTER_API_KEY) return false;
    return true;
  } catch {
    return false;
  }
}

export const SUGGESTED_PROMPTS = [
  {
    title: "Kanban Board",
    description:
      "Create a Kanban-style project board with columns for To Do, In Progress, and Done. Let users add, edit, and drag tasks between columns. Include task labels, due dates, and a clean minimal design.",
  },
  {
    title: "Booking App",
    description:
      "Build a premium appointment booking app for a small studio. Include service selection, staff selection, date and time slots, customer details, booking confirmation, and a mobile-first schedule view.",
  },
  {
    title: "Habit Tracker",
    description:
      "Build a daily habit tracker where I can add habits and check them off each day. Show a weekly streak view with a heatmap-style grid, track completion percentages, and celebrate streaks with animations.",
  },
  {
    title: "Expense Tracker",
    description:
      "Make a personal expense tracker where I can log expenses with categories like food, transport, and entertainment. Show a monthly breakdown with interactive pie and bar charts, and a running total.",
  },
  {
    title: "Workout Timer",
    description:
      "Make an interval workout timer for HIIT training. Let me configure work and rest durations, number of rounds, and exercises. Show a large countdown display with color changes for work vs rest, and play a sound when switching.",
  },
  {
    title: "Calculator",
    description:
      "Make a beautiful scientific calculator with a history panel that shows past calculations. Support basic arithmetic, percentages, parentheses, and common functions like square root and exponents. Style it with a modern glassmorphism design.",
  },
  {
    title: "Streamlit Dashboard",
    description:
      "Build a Streamlit-style Python dashboard with st.title, st.metric cards for KPIs, st.sidebar filters, and st.button actions. Use sample analytics data and a clean layout.",
  },
];
