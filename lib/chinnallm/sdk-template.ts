/** Injectable ChinnaLLM SDK (Phase 2).
 * This string is written into users' generated apps as lib/chinnallm.ts.
 * It calls the platform ChinnaLLM invoke endpoint — provider names never appear.
 */
export const CHINNALLM_SDK = `// lib/chinnallm.ts — ChinnaLLM AI SDK (auto-injected)
// Provides AI capabilities for your app via ChinnaLLM service.

const CHINNALLM_ENDPOINT = "/api/chinnallm/invoke";

type ChinnaLLMOptions = {
  model?: "auto" | "free" | "lite" | "pro" | "ultra" | "code" | "vision" | "think";
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  useByok?: boolean;
};

export const chinnaLLM = {
  async text(prompt: string, options: ChinnaLLMOptions = {}) {
    const res = await fetch(CHINNALLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "text", prompt, ...options }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async vision(imageUrl: string, prompt: string, options: ChinnaLLMOptions = {}) {
    const res = await fetch(CHINNALLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vision", imageUrl, prompt, ...options }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async image(prompt: string, options: ChinnaLLMOptions = {}) {
    const res = await fetch(CHINNALLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "image", prompt, ...options }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async code(prompt: string, language: string = "typescript", options: ChinnaLLMOptions = {}) {
    const res = await fetch(CHINNALLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "code", prompt, language, ...options }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  stream(prompt: string, options: ChinnaLLMOptions = {}) {
    return fetch(CHINNALLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "text", prompt, stream: true, ...options }),
    }).then(res => {
      if (!res.ok) throw new Error("Stream failed");
      return res.body;
    });
  },
};
`;

/** Maps SDK-facing friendly model aliases to ChinnaLLM tiers. */
export const SDK_MODEL_ALIAS_TO_TIER: Record<string, string> = {
  auto: "auto",
  free: "free",
  lite: "free",
  pro: "flagship",
  ultra: "flagship",
  code: "coding",
  vision: "vision",
  think: "reasoning",
};
