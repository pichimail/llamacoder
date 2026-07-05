/** Feature flags (Phase 4). Every feature shipped in P1–P4 is dynamically
 * controllable from the admin panel. DB rows override these defaults;
 * unknown/missing flags default to enabled so the platform fails open. */
import { getPrisma } from "@/lib/prisma";

export type FeatureFlagDef = {
  key: string;
  label: string;
  description: string;
  category: "builder" | "ai" | "chat" | "platform";
  enabled: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlagDef[] = [
  // Builder (Phase 1)
  { key: "style-picker", label: "Style presets", description: "5-style output picker in the prompt composer", category: "builder", enabled: true },
  { key: "shadcn-default", label: "shadcn by default", description: "New chats default to shadcn/ui generation", category: "builder", enabled: true },
  { key: "threejs-support", label: "Three.js / WebGL", description: "3D scene generation rules and sandbox deps", category: "builder", enabled: true },
  { key: "web-search", label: "Web search toggle", description: "Web search option in the composer", category: "builder", enabled: true },
  { key: "deep-thinking", label: "Deep thinking toggle", description: "Extended reasoning option in the composer", category: "builder", enabled: true },
  { key: "canvas-mode", label: "Canvas toggle", description: "Canvas workspace option in the composer", category: "builder", enabled: true },
  { key: "github-import", label: "GitHub import", description: "Import public repos into a chat", category: "builder", enabled: true },
  { key: "prompt-library", label: "Prompt library", description: "Save/reuse prompts from the composer", category: "builder", enabled: true },
  { key: "voice-input", label: "Voice dictation", description: "Speech-to-text in the composer", category: "builder", enabled: true },
  // AI engine (Phases 2–3)
  { key: "chinnallm", label: "ChinnaLLM engine", description: "Platform AI service for generated apps", category: "ai", enabled: true },
  { key: "ai-chooser", label: "AI integration chooser", description: "In-chat chooser when AI capabilities are detected", category: "ai", enabled: true },
  { key: "byok", label: "Bring your own key", description: "User-stored encrypted API keys", category: "ai", enabled: true },
  { key: "credit-indicator", label: "Credit indicator", description: "Live credit pill in the chat header", category: "ai", enabled: true },
  { key: "credits-page", label: "Credits page", description: "User credits + BYOK management page", category: "ai", enabled: true },
  // Chat workspace
  { key: "auto-fix", label: "Auto-fix", description: "Agent self-correction after preview validation", category: "chat", enabled: true },
  { key: "artifact-versions", label: "Artifact versions", description: "Version switcher in the action bar", category: "chat", enabled: true },
  // Platform
  { key: "gallery", label: "Gallery", description: "Featured apps gallery", category: "platform", enabled: true },
  { key: "templates", label: "Featured templates", description: "Template grid on the landing page", category: "platform", enabled: true },
  { key: "dashboard", label: "Dashboard", description: "User dashboard page", category: "platform", enabled: true },
];

export type FeatureFlagMap = Record<string, boolean>;

/** Server-side: defaults overlaid with DB rows. Fails open on DB errors. */
export async function getFeatureFlags(): Promise<FeatureFlagMap> {
  const map: FeatureFlagMap = Object.fromEntries(DEFAULT_FEATURE_FLAGS.map((f) => [f.key, f.enabled]));
  try {
    const prisma = getPrisma();
    const rows = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
    for (const row of rows) map[row.key] = row.enabled;
  } catch {
    // fail open with defaults
  }
  return map;
}

export function isFlagEnabled(map: FeatureFlagMap, key: string): boolean {
  return map[key] !== false; // unknown keys => enabled
}
