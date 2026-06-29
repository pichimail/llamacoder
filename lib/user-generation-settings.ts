import "server-only";

import { getPrisma } from "@/lib/prisma";

type SecretValue = {
  value: string;
  updatedAt: string;
};

export type UserMcpServer = {
  id: string;
  name: string;
  url: string;
  token?: string;
  enabled: boolean;
};

export type UserConnector = {
  id: string;
  name: string;
  type: "webhook" | "database" | "api" | "mcp";
  endpoint: string;
  token?: string;
  enabled: boolean;
};

export type UserGenerationSettings = {
  defaultModel: string;
  defaultMode: "ask" | "plan" | "agent";
  promptStyle: string;
  aiKeys: Record<string, SecretValue>;
  database: {
    url?: SecretValue;
    provider?: string;
  };
  mcpServers: UserMcpServer[];
  connectors: UserConnector[];
  artifactPrefs: {
    shadcn: boolean;
    accessibility: boolean;
    responsive: boolean;
    strictBackend: boolean;
  };
};

export const DEFAULT_USER_GENERATION_SETTINGS: UserGenerationSettings = {
  defaultModel: "zai-org/GLM-5",
  defaultMode: "agent",
  promptStyle: "premium-production",
  aiKeys: {},
  database: {},
  mcpServers: [],
  connectors: [],
  artifactPrefs: {
    shadcn: true,
    accessibility: true,
    responsive: true,
    strictBackend: true,
  },
};

function keyFor(userId: string) {
  return `user:${userId}:generation-settings`;
}

function safeParse(value?: string | null): Partial<UserGenerationSettings> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Partial<UserGenerationSettings>;
  } catch {
    return {};
  }
}

export function maskSecret(value?: string) {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export function mergeUserGenerationSettings(input: Partial<UserGenerationSettings>): UserGenerationSettings {
  return {
    ...DEFAULT_USER_GENERATION_SETTINGS,
    ...input,
    aiKeys: { ...(DEFAULT_USER_GENERATION_SETTINGS.aiKeys || {}), ...(input.aiKeys || {}) },
    database: { ...(DEFAULT_USER_GENERATION_SETTINGS.database || {}), ...(input.database || {}) },
    artifactPrefs: { ...DEFAULT_USER_GENERATION_SETTINGS.artifactPrefs, ...(input.artifactPrefs || {}) },
    mcpServers: Array.isArray(input.mcpServers) ? input.mcpServers : [],
    connectors: Array.isArray(input.connectors) ? input.connectors : [],
  };
}

export async function getUserGenerationSettings(userId: string): Promise<UserGenerationSettings> {
  const prisma = getPrisma();
  const row = await prisma.setting.findUnique({ where: { key: keyFor(userId) } }).catch(() => null);
  return mergeUserGenerationSettings(safeParse(row?.value));
}

export async function saveUserGenerationSettings(userId: string, settings: UserGenerationSettings) {
  const prisma = getPrisma();
  return prisma.setting.upsert({
    where: { key: keyFor(userId) },
    create: { key: keyFor(userId), value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
}

export async function patchUserGenerationSettings(userId: string, patch: Partial<UserGenerationSettings>) {
  const current = await getUserGenerationSettings(userId);
  const next = mergeUserGenerationSettings({
    ...current,
    ...patch,
    aiKeys: { ...current.aiKeys, ...(patch.aiKeys || {}) },
    database: { ...current.database, ...(patch.database || {}) },
    artifactPrefs: { ...current.artifactPrefs, ...(patch.artifactPrefs || {}) },
    mcpServers: patch.mcpServers ?? current.mcpServers,
    connectors: patch.connectors ?? current.connectors,
  });
  await saveUserGenerationSettings(userId, next);
  return next;
}

export function publicUserGenerationSettings(settings: UserGenerationSettings) {
  const publicKeys = Object.fromEntries(
    Object.entries(settings.aiKeys).map(([key, secret]) => [
      key,
      {
        configured: Boolean(secret?.value),
        masked: maskSecret(secret?.value),
        updatedAt: secret?.updatedAt,
      },
    ]),
  );

  return {
    ...settings,
    aiKeys: publicKeys,
    database: {
      provider: settings.database.provider || "postgres",
      configured: Boolean(settings.database.url?.value),
      masked: maskSecret(settings.database.url?.value),
      updatedAt: settings.database.url?.updatedAt,
    },
    mcpServers: settings.mcpServers.map((server) => ({
      ...server,
      token: server.token ? maskSecret(server.token) : undefined,
      hasToken: Boolean(server.token),
    })),
    connectors: settings.connectors.map((connector) => ({
      ...connector,
      token: connector.token ? maskSecret(connector.token) : undefined,
      hasToken: Boolean(connector.token),
    })),
  };
}

export function getUserProviderKeys(settings: UserGenerationSettings) {
  return {
    OPENROUTER_API_KEY: settings.aiKeys.openrouter?.value,
    TOGETHER_API_KEY: settings.aiKeys.together?.value,
    GOOGLE_GENERATIVE_AI_API_KEY: settings.aiKeys.gemini?.value,
    ANTHROPIC_API_KEY: settings.aiKeys.anthropic?.value,
    DATABASE_URL: settings.database.url?.value,
  };
}
