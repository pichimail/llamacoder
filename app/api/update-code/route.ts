import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getFallbackModel } from "@/lib/constants";
import { createChatStreamWithFallback } from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";

const schema = z.object({
  chatId: z.string().min(1),
  request: z.string().trim().min(1).max(20000),
  model: z.string().optional(),
});

function fileContext(files: unknown) {
  if (!Array.isArray(files)) return "";
  return files
    .map((file: any) => {
      const path = String(file?.path || "file.tsx");
      const code = String(file?.code || file?.content || "");
      return `--- ${path}\n${code.slice(0, 12000)}`;
    })
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await rateLimitOrThrow(`update-code:${parsed.data.chatId}`, { limit: 30, windowSeconds: 60 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limited" }, { status: 429 });
  }

  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: parsed.data.chatId },
    include: { messages: { orderBy: { position: "asc" } } },
  });
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const latestAssistant = chat.messages.slice().reverse().find((message) => message.role === "assistant" && Array.isArray(message.files));
  const latestFiles = fileContext(latestAssistant?.files);
  const editPrompt = `Apply this request as a precise code patch. Use only the latest file context below. Return only changed files with path metadata.\n\nREQUEST:\n${parsed.data.request}\n\nLATEST FILES:\n${latestFiles}`;
  const maxPosition = chat.messages.length ? Math.max(...chat.messages.map((message) => message.position)) : -1;
  const userMessage = await prisma.message.create({
    data: { role: "user", content: editPrompt, position: maxPosition + 1, chatId: chat.id },
  });

  const result = await createChatStreamWithFallback({
    model: parsed.data.model || chat.model || getFallbackModel().value,
    messages: [
      { role: "system", content: chat.messages[0]?.content || "You are a coding assistant." },
      { role: "user", content: editPrompt },
    ],
    maxTokens: 9000,
    temperature: 0.25,
  });

  return new Response(result.stream, {
    headers: {
      "x-hyperspeed-message-id": userMessage.id,
      "x-hyperspeed-model": result.model,
      "x-hyperspeed-provider": result.provider,
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300;
