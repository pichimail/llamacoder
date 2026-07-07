import "server-only";
import { getPrisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  saasMode: "saasMode", // "on" | "off" — gates auth + SaaS features
  googleAuth: "googleAuth", // "on" | "off" — show Google sign-in when SaaS mode on
  gallery: "gallery", // "on" | "off" — public gallery enabled
  autoFixDefault: "autoFixDefault", // "on" | "off" — auto-fix enabled by default in builder
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<string, string> = {
  saasMode: "on",
  googleAuth: "on",
  gallery: "on",
  // Auto-fix defaults ON. Leaving this off meant most users never discovered
  // the toggle, so validation failures (including truncated generations)
  // dead-ended into an error instead of self-healing. Admins can still turn
  // it off platform-wide from Settings if they prefer manual control.
  autoFixDefault: "on",
};

let settingsCache: { value: Record<string, string>; ts: number } | null = null;
const SETTINGS_CACHE_TTL = 60_000; // 60s - these change rarely

export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && now - settingsCache.ts < SETTINGS_CACHE_TTL) {
    return settingsCache.value;
  }

  const prisma = getPrisma();
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    settingsCache = { value: map, ts: now };
    return map;
  } catch {
    const fallback = { ...DEFAULTS };
    settingsCache = { value: fallback, ts: now };
    return fallback;
  }
}

export async function setSetting(key: string, value: string) {
  const prisma = getPrisma();
  return prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
