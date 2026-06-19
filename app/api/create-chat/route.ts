import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
} from "@/lib/prompts";
import { z } from "zod";
import { resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";
import { anyProviderConfigured } from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { buildPhaseOneSpec } from "@/lib/build-engine";
import { seedBuildArtifacts } from "@/lib/build-workspace";

const createChatSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(20000),
  model: z.string().min(1),
  quality: z.enum(["low", "high"]).optional().default("low"),
  screenshotUrl: z.string().url().optional(),
  mode: z.enum(["ask", "plan", "agent"]).optional().default("agent"),
  attachments: z
    .array(
      z.object({
        kind: z.enum(["image", "file"]),
        filename: z.string().min(1),
        url: z.string().url().optional(),
        size: z.number().int().nonnegative().optional(),
      }),
    )
    .optional()
    .default([]),
  shadcn: z.boolean().optional().default(true),
});

function attachmentContext(attachments: {
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
}[]) {
  if (attachments.length === 0) return "";
  return `\n\nAttachments:\n${attachments
    .map((attachment, index) => {
      const parts = [
        `${index + 1}. [${attachment.kind}] ${attachment.filename}`,
      ];
      if (attachment.size) parts.push(`${Math.round(attachment.size / 1024)} KB`);
      if (attachment.url) parts.push(attachment.url);
      return parts.join(" - ");
    })
    .join("\n")}`;
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = createChatSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }

    const { prompt, model, quality, screenshotUrl, mode, attachments, shadcn } = parsed.data;
    const resolvedModel = resolveModel(model);
    const promptWithAttachments = `${prompt}${attachmentContext(attachments)}`;
    const buildSpec = buildPhaseOneSpec({ prompt: promptWithAttachments, mode, shadcn });

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing database URL" }, { status: 500 });
    }
    if (!anyProviderConfigured()) {
      return NextResponse.json({ error: "Server misconfiguration: configure TOGETHER_API_KEY or OPENROUTER_API_KEY" }, { status: 500 });
    }

    try {
      await rateLimitOrThrow(`create-chat:${request.headers.get("x-forwarded-for") || "local"}`, { limit: 18, windowSeconds: 60 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limited" }, { status: 429 });
    }

    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: { model: resolvedModel, quality, prompt, title: buildSpec.title, shadcn },
    });

    const userMessage = screenshotUrl
      ? `${promptWithAttachments}\n\nScreenshot attachment: ${screenshotUrl}`
      : promptWithAttachments;

    const newChat = await prisma.chat.update({
      where: { id: chat.id },
      data: {
        title: buildSpec.title,
        messages: {
          create: [
            {
              role: "system",
              content:
                `${buildSpec.systemContext}\n\n${getMainCodingPrompt(
                  mode,
                  !!screenshotUrl,
                  false,
                  promptWithAttachments,
                  shadcn,
                )}`,
              position: 0,
            },
            {
              role: "user",
              content: userMessage,
              position: 1,
              ...(attachments.length > 0
                ? { files: attachments as Prisma.InputJsonValue }
                : {}),
            },
          ],
        },
      },
      include: { messages: true },
    });

    const lastMessage = newChat.messages.sort((a, b) => a.position - b.position).at(-1);
    if (!lastMessage) throw new Error("No new message");

    const seededArtifacts = await seedBuildArtifacts(
      chat.id,
      buildSpec.title,
      promptWithAttachments,
      buildSpec.artifactFiles,
    );

    logGeneration({
      chatId: chat.id,
      model: resolvedModel,
      input: { prompt, hasScreenshot: !!screenshotUrl, quality, mode },
      output: userMessage,
      metadata: { type: "initial_generation", title: buildSpec.title, template: buildSpec.templateId },
    });

    return NextResponse.json({
      chatId: chat.id,
      lastMessageId: lastMessage.id,
      buildSpec,
      artifacts: buildSpec.artifactFiles,
      seededArtifacts,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const message = isDev && error instanceof Error ? `Failed to create chat: ${error.message}` : "Failed to create chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
