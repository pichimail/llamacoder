/** ChinnaLLM model registry (Phase 2).
 * CRITICAL: OpenRouter model IDs live ONLY here and in the admin panel API.
 * They must never surface in user-visible UI, the injected SDK, or generated code.
 */
import { getPrisma } from "@/lib/prisma";
import type { ChinnaLLMModel } from "@prisma/client";

import { CHINNALLM_TIERS, type ChinnaLLMTier } from "@/lib/chinnallm/tiers";

export { CHINNALLM_TIERS };
export type { ChinnaLLMTier };

export type ChinnaLLMSeedModel = {
  displayName: string;
  openRouterId: string;
  tier: ChinnaLLMTier;
  costPerKTokens: number;
  enabled: boolean;
  sortOrder: number;
  description: string;
  capabilities: string[];
};

export const CHINNALLM_DEFAULT_MODELS: ChinnaLLMSeedModel[] = [
  // Budget
  { displayName: "ChinnaLLM Lite", openRouterId: "openrouter/free", tier: "budget", costPerKTokens: 0, enabled: true, sortOrder: 0, description: "Free lightweight route for everyday text tasks.", capabilities: ["text", "streaming"] },
  { displayName: "ChinnaLLM Code Lite", openRouterId: "qwen/qwen3-coder", tier: "budget", costPerKTokens: 1, enabled: true, sortOrder: 1, description: "Budget-friendly coding assistant.", capabilities: ["text", "streaming"] },
  // Coding
  { displayName: "ChinnaLLM Code", openRouterId: "anthropic/claude-sonnet-5", tier: "coding", costPerKTokens: 3, enabled: true, sortOrder: 0, description: "High-quality code generation and refactoring.", capabilities: ["text", "vision", "streaming"] },
  { displayName: "ChinnaLLM Code Pro", openRouterId: "deepseek/deepseek-v4-pro", tier: "coding", costPerKTokens: 3, enabled: true, sortOrder: 1, description: "Specialist coding model for large edits.", capabilities: ["text", "streaming"] },
  // Flagship
  { displayName: "ChinnaLLM Pro", openRouterId: "sakana/fugu-ultra", tier: "flagship", costPerKTokens: 10, enabled: true, sortOrder: 0, description: "Top-tier multi-agent reasoning and generation quality.", capabilities: ["text", "vision", "streaming", "reasoning"] },
  { displayName: "ChinnaLLM Ultra", openRouterId: "anthropic/claude-opus-4.8", tier: "flagship", costPerKTokens: 10, enabled: true, sortOrder: 1, description: "Flagship multimodal model.", capabilities: ["text", "vision", "streaming"] },
  // Reasoning
  { displayName: "ChinnaLLM Think", openRouterId: "qwen/qwen3-max-thinking", tier: "reasoning", costPerKTokens: 8, enabled: true, sortOrder: 0, description: "Deep step-by-step reasoning.", capabilities: ["text", "streaming", "reasoning"] },
  { displayName: "ChinnaLLM Reason", openRouterId: "deepseek/deepseek-v4-pro", tier: "reasoning", costPerKTokens: 8, enabled: true, sortOrder: 1, description: "Extended-thinking reasoning model.", capabilities: ["text", "streaming", "reasoning"] },
  // Vision
  { displayName: "ChinnaLLM Vision", openRouterId: "anthropic/claude-sonnet-4.5", tier: "vision", costPerKTokens: 5, enabled: true, sortOrder: 0, description: "Image understanding and analysis.", capabilities: ["text", "vision", "streaming"] },
  { displayName: "ChinnaLLM Vision Pro", openRouterId: "openai/gpt-4o", tier: "vision", costPerKTokens: 5, enabled: true, sortOrder: 1, description: "Advanced multimodal vision.", capabilities: ["text", "vision", "streaming"] },
  // Image gen
  { displayName: "ChinnaLLM Image", openRouterId: "black-forest-labs/flux-1.1-pro", tier: "image", costPerKTokens: 20, enabled: true, sortOrder: 0, description: "High-quality image generation.", capabilities: ["image"] },
  // Video gen
  { displayName: "ChinnaLLM Video", openRouterId: "runwayml/runway-gen3", tier: "video", costPerKTokens: 50, enabled: true, sortOrder: 0, description: "Short-form video generation.", capabilities: ["video"] },
  // Music gen
  { displayName: "ChinnaLLM Music", openRouterId: "suno/suno-chirp-v3", tier: "music", costPerKTokens: 30, enabled: true, sortOrder: 0, description: "Music and audio generation.", capabilities: ["music"] },
  // Code gen (max)
  { displayName: "ChinnaLLM Code Max", openRouterId: "qwen/qwen3-coder-next", tier: "code", costPerKTokens: 5, enabled: true, sortOrder: 0, description: "Largest coding model for complex codebases.", capabilities: ["text", "streaming"] },
  // Free
  { displayName: "ChinnaLLM Free", openRouterId: "openrouter/free", tier: "free", costPerKTokens: 0, enabled: true, sortOrder: 0, description: "OpenRouter free route for basic AI output.", capabilities: ["text", "streaming"] },
  { displayName: "ChinnaLLM Free Fallback", openRouterId: "openrouter/auto", tier: "free", costPerKTokens: 0, enabled: true, sortOrder: 1, description: "Automatic fallback when free-route capacity is unavailable.", capabilities: ["text", "streaming"] },
  // Auto
  { displayName: "ChinnaLLM Auto", openRouterId: "openrouter/auto", tier: "auto", costPerKTokens: 3, enabled: true, sortOrder: 0, description: "Automatically routes to the best model.", capabilities: ["text", "streaming"] },
];

export function isChinnaLLMTier(value: unknown): value is ChinnaLLMTier {
  return typeof value === "string" && (CHINNALLM_TIERS as string[]).includes(value);
}

/** Best (lowest sortOrder) enabled model in a tier, with DB-first, seed fallback. */
export async function getModelByTier(tier: ChinnaLLMTier): Promise<ChinnaLLMModel | null> {
  const prisma = getPrisma();
  return prisma.chinnaLLMModel.findFirst({
    where: { tier, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** All enabled models in a tier, ordered — used for fallback chains. */
export async function getModelsByTier(tier: string): Promise<ChinnaLLMModel[]> {
  const prisma = getPrisma();
  return prisma.chinnaLLMModel.findMany({
    where: { tier, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getModelById(id: string): Promise<ChinnaLLMModel | null> {
  const prisma = getPrisma();
  return prisma.chinnaLLMModel.findUnique({ where: { id } });
}

export async function getAllEnabledModels(): Promise<ChinnaLLMModel[]> {
  const prisma = getPrisma();
  return prisma.chinnaLLMModel.findMany({
    where: { enabled: true },
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
  });
}

/** User-safe projection: strips openRouterId and internal cost mapping. */
export function toPublicModel(model: ChinnaLLMModel) {
  return {
    id: model.id,
    displayName: model.displayName,
    tier: model.tier,
    description: model.description,
    capabilities: model.capabilities,
    costPerKTokens: model.costPerKTokens,
  };
}
