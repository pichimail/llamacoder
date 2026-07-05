import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserOrNull } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";

const settingsSchema = z.object({
  defaultModel: z.string().min(1).default("zai-org/GLM-5"),
  defaultMode: z.enum(["ask", "plan", "agent"]).default("agent"),
  defaultFramework: z.enum(["next", "react", "vite"]).default("next"),
  defaultStyling: z.enum(["shadcn", "tailwind", "css"]).default("shadcn"),
  packageManager: z.enum(["pnpm", "npm", "bun"]).default("pnpm"),
  previewMode: z.enum(["web", "mobile", "split"]).default("split"),
  deployTarget: z.enum(["vercel", "none"]).default("vercel"),
  defaultBranch: z.string().min(1).max(80).default("main"),
  githubRepositoryUrl: z.string().max(300).default(""),
  webSearchDefault: z.boolean().default(false),
  deepThinkingDefault: z.boolean().default(false),
  canvasDefault: z.boolean().default(false),
  backendDefault: z.boolean().default(false),
  shadcnDefault: z.boolean().default(true),
  styleDefault: z.enum(["modern-saas", "editorial-dark", "warm-neutral", "vibrant-accent", "glassmorphism"]).default("modern-saas"),
  autoStartGeneration: z.boolean().default(true),
  autoRepairPreview: z.boolean().default(true),
  memoryCompression: z.boolean().default(true),
  saveArtifactsToWorkspace: z.boolean().default(true),
  enableBlobUploads: z.boolean().default(true),
  generateOgImages: z.boolean().default(true),
  accessibilityStrictMode: z.boolean().default(true),
});

export type UserBuilderSettings = z.infer<typeof settingsSchema>;

const defaultSettings: UserBuilderSettings = settingsSchema.parse({});

function settingKey(userId: string | null) {
  return `user-builder-settings:${userId || "guest"}`;
}

async function resolveUser() {
  const user = await getCurrentUserOrNull();
  // settings can be lenient; if no user return guest defaults
  return { user };
}

export async function GET() {
  try {
    const resolved = await resolveUser();
    if ((resolved as any).error) return (resolved as any).error;

    const prisma = getPrisma();
    const row = await prisma.setting.findUnique({
      where: { key: settingKey(resolved.user?.id || null) },
    });

    if (!row) return NextResponse.json({ settings: defaultSettings });

    const parsed = settingsSchema.parse({ ...defaultSettings, ...JSON.parse(row.value) });
    return NextResponse.json({ settings: parsed, updatedAt: row.updatedAt });
  } catch {
    // Keep builder responsive even if auth/session/settings storage is unhealthy.
    return NextResponse.json({ settings: defaultSettings, recovered: true });
  }
}

export async function PUT(request: Request) {
  const resolved = await resolveUser();
  if ((resolved as any).error) return (resolved as any).error;

  const json = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse({ ...defaultSettings, ...(json?.settings || json || {}) });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid settings" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.setting.upsert({
    where: { key: settingKey(resolved.user?.id || null) },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: settingKey(resolved.user?.id || null), value: JSON.stringify(parsed.data) },
  });

  return NextResponse.json({ settings: parsed.data, updatedAt: row.updatedAt });
}
