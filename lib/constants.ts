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
};

export const WORKING_FALLBACK_MODEL = "zai-org/GLM-5.1";

export const MODEL_ALIASES: Record<string, string> = {
  "zai-org/GLM-4.6": "zai-org/GLM-5.1",
  "Qwen/Qwen2.5-Coder-32B-Instruct": "zai-org/GLM-5.1",
  "MiniMaxAI/MiniMax-M2.5": "MiniMaxAI/MiniMax-M2.7",
  "glm-5": "zai-org/GLM-5",
  "glm-5.1": "zai-org/GLM-5.1",
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
    label: "OpenRouter Auto",
    value: "openrouter/auto",
    nativeModel: "openrouter/auto",
    provider: "openrouter",
    status: "fallback",
    recommended: true,
    description: "Runtime-routed OpenRouter model",
  },
  {
    label: "Claude Sonnet 4.5",
    value: "openrouter/anthropic/claude-sonnet-4.5",
    nativeModel: "anthropic/claude-sonnet-4.5",
    provider: "openrouter",
    status: "experimental",
    description: "OpenRouter coding model",
  },
  {
    label: "DeepSeek V3.2",
    value: "openrouter/deepseek/deepseek-v3.2",
    nativeModel: "deepseek/deepseek-v3.2",
    provider: "openrouter",
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
  return getModelConfig(WORKING_FALLBACK_MODEL);
}

export function getVisibleModels() {
  return MODELS.filter((model) => !model.hidden);
}

export const SUGGESTED_PROMPTS = [
  {
    title: "Kanban Board",
    description:
      "Create a Kanban-style project board with columns for To Do, In Progress, and Done. Let users add, edit, and drag tasks between columns. Include task labels, due dates, and a clean minimal design.",
  },
  {
    title: "Landing Page",
    description:
      "Build a modern landing page for an AI startup with a bold hero section, an animated feature grid, a pricing table with three tiers, a testimonials carousel, and a waitlist signup form. Use smooth scroll animations and a sleek dark theme.",
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
];
