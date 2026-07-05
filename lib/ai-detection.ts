/** AI feature detection (Phase 3).
 * Scans user prompts to determine whether the app needs AI capabilities,
 * and which ChinnaLLM tiers to recommend. Pure function — no DB or network.
 */

export type AICapability = "text" | "vision" | "image" | "code" | "music" | "video";

export type AIDetectionResult = {
  detected: boolean;
  capabilities: AICapability[];
};

const CAPABILITY_PATTERNS: Array<{ capability: AICapability; patterns: RegExp[] }> = [
  {
    capability: "text",
    patterns: [
      /\b(chat\s*bot|chatbot|ai\s*chat|llm|gpt|generate\s*text|summarize|summarizer|classify|classifier|translate|translator|sentiment|recommend|recommender|predict|predictor|autocomplete|copilot|assistant|smart\s*search|natural\s*language|nlp|ai\s*agent|rag|knowledge\s*base|semantic\s*search|embeddings|speech[-\s]to[-\s]text|text[-\s]to[-\s]speech|voice\s*ai)\b/i,
      /\b(ai|artificial\s*intelligence)\s+(feature|integration|powered|driven|enabled|based|assistant|capability|service|api|model)\b/i,
      /\b(with|using|use|add|integrate|build.+with)\s+(ai|llm|gpt|openai|anthropic|claude|gemini)\b/i,
    ],
  },
  {
    capability: "vision",
    patterns: [
      /\b(vision|ocr|scan|analyze\s*image|image\s*analy|image\s*recognition|object\s*detect|face\s*detect|visual\s*ai|read\s*image|extract\s*from\s*image|image\s*classification|photo\s*analy)\b/i,
    ],
  },
  {
    capability: "image",
    patterns: [
      /\b(image\s*generat|create\s*image|generate\s*image|dall[-\s]?e|midjourney|stable\s*diffusion|ai\s*art|ai\s*image|text[-\s]to[-\s]image|generate.*\b(picture|photo|illustration|artwork|graphic))\b/i,
    ],
  },
  {
    capability: "code",
    patterns: [
      /\b(code\s*generat|generate\s*code|ai\s*code|code\s*assist|code\s*completion|code\s*review|ai\s*coding|code\s*copilot)\b/i,
    ],
  },
  {
    capability: "music",
    patterns: [
      /\b(music\s*generat|generate\s*music|ai\s*music|music\s*ai|audio\s*generat|compose\s*music|song\s*generat|beat\s*generat)\b/i,
    ],
  },
  {
    capability: "video",
    patterns: [
      /\b(video\s*generat|generate\s*video|ai\s*video|text[-\s]to[-\s]video|video\s*ai|video\s*creation\s*ai)\b/i,
    ],
  },
];

/** Map each AI capability to the best ChinnaLLM tier. */
export const CAPABILITY_MODEL_MAP: Record<AICapability, string> = {
  text: "auto",
  vision: "vision",
  image: "image",
  code: "coding",
  music: "music",
  video: "video",
};

/** Detect whether a user's prompt implies the generated app needs AI capabilities. */
export function requiresAI(prompt: string): AIDetectionResult {
  const capabilities: AICapability[] = [];
  for (const { capability, patterns } of CAPABILITY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(prompt))) {
      capabilities.push(capability);
    }
  }
  return { detected: capabilities.length > 0, capabilities };
}
