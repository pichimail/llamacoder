import "server-only";

import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type GenerationLogInput = {
  chatId?: string;
  messageId?: string;
  model: string;
  provider?: string;
  event?: string;
  status?: string;
  input?: unknown;
  output?: string;
  metadata?: Record<string, unknown>;
  scores?: Record<string, number>;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type GenerationLogRow = {
  id: string;
  chatId: string | null;
  messageId: string | null;
  model: string;
  provider: string | null;
  event: string;
  status: string;
  input: unknown | null;
  output: string | null;
  outputPreview: string;
  metadata: Record<string, unknown> | null;
  scores: Record<string, number> | null;
  durationMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  braintrustProjectId: string | null;
  createdAt: Date;
};

let tableReady: Promise<void> | null = null;

function asJson(value: unknown) {
  if (value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function outputPreview(output?: string) {
  return (output || "").replace(/\s+/g, " ").trim().slice(0, 280);
}

export function isBraintrustConfigured() {
  return Boolean(process.env.BRAINTRUST_API_KEY);
}

export function getBraintrustProjectId() {
  return process.env.BRAINTRUST_PROJECT_ID || null;
}

export async function ensureGenerationLogTable() {
  if (!tableReady) {
    tableReady = (async () => {
      const prisma = getPrisma();
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "GenerationLog" (
          "id" TEXT PRIMARY KEY,
          "chatId" TEXT,
          "messageId" TEXT,
          "model" TEXT NOT NULL,
          "provider" TEXT,
          "event" TEXT NOT NULL DEFAULT 'generation',
          "status" TEXT NOT NULL DEFAULT 'logged',
          "input" JSONB,
          "output" TEXT,
          "outputPreview" TEXT NOT NULL DEFAULT '',
          "metadata" JSONB,
          "scores" JSONB,
          "durationMs" INTEGER,
          "promptTokens" INTEGER,
          "completionTokens" INTEGER,
          "totalTokens" INTEGER,
          "braintrustProjectId" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "GenerationLog_createdAt_idx" ON "GenerationLog" ("createdAt")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "GenerationLog_chatId_idx" ON "GenerationLog" ("chatId")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "GenerationLog_model_idx" ON "GenerationLog" ("model")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "GenerationLog_provider_idx" ON "GenerationLog" ("provider")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "GenerationLog_status_idx" ON "GenerationLog" ("status")`;
    })();
  }
  return tableReady;
}

export async function recordGenerationLog(params: GenerationLogInput) {
  try {
    await ensureGenerationLogTable();
    const prisma = getPrisma();
    const metadata = {
      ...(params.metadata || {}),
      braintrustEnabled: isBraintrustConfigured(),
    };

    await prisma.$executeRaw`
      INSERT INTO "GenerationLog" (
        "id", "chatId", "messageId", "model", "provider", "event", "status",
        "input", "output", "outputPreview", "metadata", "scores", "durationMs",
        "promptTokens", "completionTokens", "totalTokens", "braintrustProjectId"
      ) VALUES (
        ${nanoid(16)},
        ${params.chatId || null},
        ${params.messageId || null},
        ${params.model},
        ${params.provider || null},
        ${params.event || "generation"},
        ${params.status || "logged"},
        ${asJson(params.input)},
        ${params.output || null},
        ${outputPreview(params.output)},
        ${asJson(metadata)},
        ${asJson(params.scores || null)},
        ${params.durationMs || null},
        ${params.promptTokens || null},
        ${params.completionTokens || null},
        ${params.totalTokens || null},
        ${getBraintrustProjectId()}
      )
    `;
  } catch (error) {
    console.warn("Generation observability log failed:", error);
  }
}

export async function getGenerationLogDashboard(options: { limit?: number; model?: string } = {}) {
  await ensureGenerationLogTable();
  const prisma = getPrisma();
  const limit = Math.min(Math.max(options.limit || 80, 1), 200);

  const logs = options.model
    ? await prisma.$queryRaw<GenerationLogRow[]>`
        SELECT * FROM "GenerationLog"
        WHERE "model" = ${options.model}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<GenerationLogRow[]>`
        SELECT * FROM "GenerationLog"
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `;

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "GenerationLog"`;
  const modelRows = await prisma.$queryRaw<{ model: string; provider: string | null; count: bigint }[]>`
    SELECT "model", "provider", COUNT(*)::bigint AS count
    FROM "GenerationLog"
    GROUP BY "model", "provider"
    ORDER BY count DESC
    LIMIT 20
  `;
  const statusRows = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT "status", COUNT(*)::bigint AS count
    FROM "GenerationLog"
    GROUP BY "status"
    ORDER BY count DESC
  `;

  return {
    logs,
    total: Number(count || 0),
    byModel: modelRows.map((row) => ({ ...row, count: Number(row.count) })),
    byStatus: statusRows.map((row) => ({ ...row, count: Number(row.count) })),
    braintrustConfigured: isBraintrustConfigured(),
    braintrustProjectId: getBraintrustProjectId(),
  };
}
