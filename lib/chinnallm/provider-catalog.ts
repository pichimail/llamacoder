export const BYOK_PROVIDER_IDS = [
  "openrouter",
  "openai",
  "anthropic",
  "xai",
  "google",
  "together",
  "nvidia",
] as const;

export type BYOKProviderId = (typeof BYOK_PROVIDER_IDS)[number];

export type BYOKProvider = {
  id: BYOKProviderId;
  label: string;
  shortName: string;
  apiKeyUrl: string;
  logoUrl: string;
  placeholder: string;
  defaultModel: string;
};

export const BYOK_PROVIDERS: BYOKProvider[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    shortName: "OpenRouter",
    apiKeyUrl: "https://openrouter.ai/keys",
    logoUrl: "https://www.google.com/s2/favicons?domain=openrouter.ai&sz=64",
    placeholder: "sk-or-v1-...",
    defaultModel: "openrouter/auto",
  },
  {
    id: "openai",
    label: "OpenAI ChatGPT",
    shortName: "OpenAI",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    logoUrl: "https://www.google.com/s2/favicons?domain=openai.com&sz=64",
    placeholder: "sk-...",
    defaultModel: "gpt-4.1-mini",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    shortName: "Anthropic",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    logoUrl: "https://www.google.com/s2/favicons?domain=anthropic.com&sz=64",
    placeholder: "sk-ant-...",
    defaultModel: "claude-3-5-haiku-latest",
  },
  {
    id: "xai",
    label: "xAI Grok",
    shortName: "Grok",
    apiKeyUrl: "https://console.x.ai/",
    logoUrl: "https://www.google.com/s2/favicons?domain=x.ai&sz=64",
    placeholder: "xai-...",
    defaultModel: "grok-4-fast-reasoning",
  },
  {
    id: "google",
    label: "Google Gemini",
    shortName: "Gemini",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    logoUrl: "https://www.google.com/s2/favicons?domain=ai.google.dev&sz=64",
    placeholder: "AIza...",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "together",
    label: "Together AI",
    shortName: "Together",
    apiKeyUrl: "https://api.together.ai/settings/api-keys",
    logoUrl: "https://www.google.com/s2/favicons?domain=together.ai&sz=64",
    placeholder: "tgp_v1_...",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    shortName: "NVIDIA",
    apiKeyUrl: "https://build.nvidia.com/",
    logoUrl: "https://www.google.com/s2/favicons?domain=nvidia.com&sz=64",
    placeholder: "nvapi-...",
    defaultModel: "meta/llama-3.1-8b-instruct",
  },
];

export function getBYOKProvider(id: string | null | undefined): BYOKProvider {
  return BYOK_PROVIDERS.find((provider) => provider.id === id) ?? BYOK_PROVIDERS[0];
}
