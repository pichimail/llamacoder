/** Client-safe ChinnaLLM tier constants (Phase 4).
 * No Prisma imports — safe to use in "use client" components. */

export type ChinnaLLMTier =
  | "budget"
  | "coding"
  | "flagship"
  | "reasoning"
  | "vision"
  | "image"
  | "video"
  | "music"
  | "code"
  | "free"
  | "auto";

export const CHINNALLM_TIERS: ChinnaLLMTier[] = [
  "auto",
  "budget",
  "free",
  "coding",
  "code",
  "flagship",
  "reasoning",
  "vision",
  "image",
  "video",
  "music",
];

export function isChinnaLLMTier(value: unknown): value is ChinnaLLMTier {
  return typeof value === "string" && (CHINNALLM_TIERS as string[]).includes(value);
}
