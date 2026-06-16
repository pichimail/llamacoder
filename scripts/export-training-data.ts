/**
 * Export prompt → assistant completion pairs for fine-tuning scaffolding.
 *
 * Usage:
 *   pnpm export:training
 *   pnpm export:training -- --out data/training.jsonl --limit 200 --min-files 1
 *
 * Output: JSONL with OpenAI-style chat fine-tuning rows:
 *   { "messages": [{ "role": "user", ... }, { "role": "assistant", ... }] }
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { extractAllCodeBlocks } from "../lib/utils";

type ExportRow = {
  chatId: string;
  messageId: string;
  model: string;
  createdAt: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
};

function parseArgs(argv: string[]) {
  const outIndex = argv.indexOf("--out");
  const limitIndex = argv.indexOf("--limit");
  const minFilesIndex = argv.indexOf("--min-files");

  return {
    out: outIndex >= 0 ? argv[outIndex + 1] : "data/training-export.jsonl",
    limit: limitIndex >= 0 ? Number(argv[limitIndex + 1]) : 500,
    minFiles: minFilesIndex >= 0 ? Number(argv[minFilesIndex + 1]) : 1,
  };
}

function assistantHasCode(content: string, files: unknown) {
  const stored = files as Array<{ path?: string; code?: string; content?: string }> | null;
  if (Array.isArray(stored) && stored.length > 0) return true;
  return extractAllCodeBlocks(content).length > 0;
}

function buildAssistantPayload(content: string, files: unknown) {
  const stored = files as Array<{ path: string; code?: string; content?: string }> | null;
  if (Array.isArray(stored) && stored.length > 0) {
    const blocks = stored
      .map((file) => {
        const code = file.code ?? file.content ?? "";
        const path = file.path || "App.tsx";
        return `\`\`\`tsx{path=${path}}\n${code}\n\`\`\``;
      })
      .join("\n\n");
    return blocks || content;
  }
  return content;
}

async function main() {
  const { out, limit, minFiles } = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaNeon(neon) });

  const chats = await prisma.chat.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      model: true,
      prompt: true,
      createdAt: true,
      messages: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          files: true,
        },
      },
    },
  });

  const rows: ExportRow[] = [];

  for (const chat of chats) {
    const assistants = chat.messages.filter(
      (message) =>
        message.role === "assistant" &&
        assistantHasCode(message.content, message.files),
    );

    if (assistants.length < minFiles) continue;

    const firstUser =
      chat.messages.find((message) => message.role === "user")?.content ||
      chat.prompt;
    const latestAssistant = assistants.at(-1);
    if (!latestAssistant) continue;

    rows.push({
      chatId: chat.id,
      messageId: latestAssistant.id,
      model: chat.model,
      createdAt: chat.createdAt.toISOString(),
      messages: [
        {
          role: "user",
          content: firstUser.trim(),
        },
        {
          role: "assistant",
          content: buildAssistantPayload(
            latestAssistant.content,
            latestAssistant.files,
          ).trim(),
        },
      ],
    });
  }

  const outputPath = resolve(process.cwd(), out);
  mkdirSync(dirname(outputPath), { recursive: true });

  const jsonl = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(outputPath, jsonl ? `${jsonl}\n` : "", "utf8");

  console.log(`Exported ${rows.length} training rows to ${outputPath}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});