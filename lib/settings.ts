import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
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

const SETTINGS_TAG = "platform-settings";

export const getSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const prisma = getPrisma();
    try {
      const rows = await prisma.setting.findMany();
      const map: Record<string, string> = { ...DEFAULTS };
      for (const r of rows) map[r.key] = r.value;
      return map;
    } catch {
      return { ...DEFAULTS };
    }
  },
  ["settings"],
  { revalidate: 300, tags: [SETTINGS_TAG] } // 5 minutes, or on-demand via revalidate
);

export async function setSetting(key: string, value: string) {
  const prisma = getPrisma();
  const result = await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidateTag(SETTINGS_TAG);
  return result;
}
