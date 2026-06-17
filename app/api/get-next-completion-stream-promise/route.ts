import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import { getFallbackModel, getHistoryCompressionModel, resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";
import {
  anyProviderConfigured,
  createChatStreamWithFallback,
  createTextWithFallback,
  type GenerationMessage,
} from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { patchModeSystemHint } from "@/lib/code-patch";

function optimizeMessagesForTokens(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  const assistantIndices: number[] = [];
  for (let i = messages.length - 1; i >= 0 && assistantIndices.length < 2; i--) {
    if (messages[i].role === "assistant") assistantIndices.push(i);
  }

  return messages.map((msg, index) => {
    if (msg.role === "assistant" && !assistantIndices.includes(index)) {
      const text = msg.content.replace(/```[\s\S]*?```/g, "").trim();
      const firstLine = text.split("\n").find((line) => line.trim().length > 10) || "";
      const summary = firstLine.slice(0, 160);
      return {
        ...msg,
        content: summary ? `[Previous version summary: ${summary}]` : "[earlier version omitted]",
      };
    }
    return msg;
  });
}

async function compressHistoryWithSmallModel(
  oldMessages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  if (oldMessages.length === 0) return "";
  const historyText = oldMessages
    .map((m, i) => `${i + 1}. ${m.role.toUpperCase()}: ${m.content.slice(0, 800)}${m.content.length > 800 ? "..." : ""}`)
    .join("\n\n");

  try {
    const result = await createTextWithFallback({
      model: getHistoryCompressionModel(),
      temperature: 0.2,
      maxTokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Compress this app-building chat history into one dense paragraph under 350 tokens. Preserve the user's current goal, selected features, what was already changed, errors/fixes, and current artifact state. Output only the summary.",
        },
        { role: "user", content: historyText },
      ],
    });
    return result.content.trim() || "Previous conversation involved iterative app building based on user feedback.";
  } catch (err) {
    console.warn("History compression failed, using local fallback:", err);
    const goals = oldMessages
      .filter((m) => m.role === "user")
      .slice(0, 3)
      .map((m) => m.content.slice(0, 120))
      .join(" | ");
    return `Earlier turns covered: ${goals}. The app was iteratively refined based on user requests.`;
  }
}

const requestSchema = z.object({
  messageId: z.string().min(1),
  model: z.string().min(1),
  reasoning: z.boolean().optional().default(false),
  quality: z.enum(["low", "high"]).optional().default("low"),
});

function improveAutofixPrompt(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const last = messages.at(-1);
  const isFix = last?.role === "user" && /preview error|runtime error|missing import|failed to compile|rebuild|fix/i.test(last.content);
  if (!isFix) return messages;

  return [
    ...messages,
    {
      role: "system" as const,
      content:
        "Auto-fix mode is active. Diagnose the exact runtime/build failure. Prefer minimal diffs when possible. Fix missing imports, wrong shadcn paths, unavailable packages, invalid JSX, client/server boundary issues, and broken exports. If the same error repeats, return the complete corrected file set. Do not explain; output only changed or complete files in fenced blocks with path metadata.",
    },
  ];
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return new Response("Server misconfiguration: missing database URL", { status: 500 });
  }
  if (!anyProviderConfigured()) {
    return new Response("Server misconfiguration: configure TOGETHER_API_KEY or OPENROUTER_API_KEY", { status: 500 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const { messageId, model, reasoning, quality } = parsed.data;

  try {
    await rateLimitOrThrow(`generation:${messageId}`, { limit: 20, windowSeconds: 60 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Rate limited", { status: 429 });
  }

  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return new Response(null, { status: 404 });

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() }))
    .parse(messagesRes);

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 8) {
    const systemMsg = messages[0];
    const firstUser = messages[1];
    const recent = messages.slice(-6);
    const middleMessages = messagesRes.slice(2, -6);
    const toCompress = messages
      .slice(2, -6)
      .filter((m) => m.role === "user" || m.role === "assistant");
    const summaryKey = middleMessages.map((m) => m.id).join("|");

    let compressedSummary = "";
    if (toCompress.length > 0) {
      const chat = await prisma.chat.findUnique({
        where: { id: message.chatId },
        select: {
          historySummary: true,
          historySummaryKey: true,
        },
      });

      if (
        chat?.historySummary &&
        chat.historySummaryKey === summaryKey &&
        chat.historySummary.trim().length > 0
      ) {
        compressedSummary = chat.historySummary;
      } else {
        compressedSummary = await compressHistoryWithSmallModel(toCompress as any);
        await prisma.chat
          .update({
            where: { id: message.chatId },
            data: {
              historySummary: compressedSummary,
              historySummaryKey: summaryKey,
              historySummaryAt: new Date(),
            },
          })
          .catch(() => undefined);
      }
    }

    messages = [
      systemMsg,
      firstUser,
      ...(compressedSummary
        ? [
            {
              role: "system" as const,
              content: `[COMPRESSED HISTORY SUMMARY]:\n${compressedSummary}`,
            },
          ]
        : []),
      ...recent,
    ];
  }

  messages = improveAutofixPrompt(messages);

  const hasPriorArtifact = messagesRes.some(
    (m) => m.role === "assistant" && (m.content.includes("```") || Array.isArray(m.files)),
  );
  if (hasPriorArtifact && message.role === "user") {
    messages = [
      ...messages,
      { role: "system" as const, content: patchModeSystemHint },
    ];
  }

  if (quality === "high" && message.role === "user") {
    messages = [
      ...messages,
      {
        role: "system" as const,
        content:
          "High-quality mode: be thorough, verify imports and dependencies, return complete working files, and proactively fix edge cases. Prefer complete corrected files over partial patches when uncertain.",
      },
    ];
  }

  const requestedModel = resolveModel(model);

  logGeneration({
    chatId: message.chatId,
    model: requestedModel,
    input: { messagesCount: messages.length, lastUser: messages[messages.length - 1]?.content?.slice(0, 300) },
    output: "[streamed]",
    metadata: { type: "followup", messageId, fallbackModel: getFallbackModel().value },
  });

  try {
    const result = await createChatStreamWithFallback({
      model: requestedModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })) as GenerationMessage[],
      temperature: 0.4,
      maxTokens: 9000,
      reasoningEnabled: reasoning,
    });
    return new Response(result.stream, {
      headers: {
        "x-hyperspeed-model": result.model,
        "x-hyperspeed-provider": result.provider,
      },
    });
  } catch (error) {
    console.error("Error starting completion stream:", error);
    const msg = error instanceof Error ? `Failed to start generation: ${error.message}` : "Failed to start generation";
    return new Response(msg, { status: 500 });
  }
}

export const runtime = "edge";
export const maxDuration = 300;
