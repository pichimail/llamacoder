import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { z } from "zod";
import { resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";
import { anyProviderConfigured, createTextWithFallback } from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";

const createChatSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(20000),
  model: z.string().min(1),
  quality: z.enum(["low", "high"]).optional().default("low"),
  screenshotUrl: z.string().url().optional(),
  mode: z.enum(["ask", "plan", "agent"]).optional().default("agent"),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = createChatSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }

    const { prompt, model, quality, screenshotUrl, mode } = parsed.data;
    const resolvedModel = resolveModel(model);

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing database URL" }, { status: 500 });
    }
    if (!anyProviderConfigured()) {
      return NextResponse.json(
        { error: "Server misconfiguration: configure TOGETHER_API_KEY or OPENROUTER_API_KEY" },
        { status: 500 },
      );
    }

    try {
      await rateLimitOrThrow(`create-chat:${request.headers.get("x-forwarded-for") || "local"}`, {
        limit: 18,
        windowSeconds: 60,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Rate limited" },
        { status: 429 },
      );
    }

    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: {
        model: resolvedModel,
        quality,
        prompt,
        title: "",
        shadcn: true,
      },
    });

    let title = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
    if (title.length > 60) title = title.slice(0, 57) + "...";
    try {
      const responseForChatTitle = await createTextWithFallback({
        model: resolvedModel,
        temperature: 0.2,
        maxTokens: 80,
        messages: [
          {
            role: "system",
            content:
              "Create a succinct 3-5 word title for this app-building chat. Return only the title.",
          },
          { role: "user", content: prompt },
        ],
      });
      const aiTitle = responseForChatTitle.content.trim();
      if (aiTitle && aiTitle.length < 100) title = aiTitle;
    } catch (titleErr) {
      console.warn("Failed to generate AI title, using fallback from prompt:", titleErr);
    }

    let fullScreenshotDescription: string | undefined;
    if (screenshotUrl) {
      try {
        const screenshotResponse = await createTextWithFallback({
          model: resolvedModel,
          temperature: 0.3,
          maxTokens: 1200,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: screenshotToCodePrompt },
                { type: "image_url", image_url: { url: screenshotUrl } },
              ],
            },
          ],
        });
        fullScreenshotDescription = screenshotResponse.content;
      } catch (err) {
        console.warn("Screenshot processing failed, continuing without it:", err);
      }
    }

    let userMessage: string;
    if (quality === "high") {
      let planContent: string | undefined;
      try {
        const initialRes = await createTextWithFallback({
          model: resolvedModel,
          temperature: 0.35,
          maxTokens: 3000,
          messages: [
            { role: "system", content: softwareArchitectPrompt },
            { role: "user", content: fullScreenshotDescription ? fullScreenshotDescription + prompt : prompt },
          ],
        });
        planContent = initialRes.content || undefined;
      } catch (planErr) {
        console.warn("High quality plan generation failed, falling back to raw prompt:", planErr);
      }
      userMessage = planContent ?? prompt;
    } else if (fullScreenshotDescription) {
      userMessage = `${prompt}\n\nRECREATE THIS APP AS CLOSELY AS POSSIBLE:\n${fullScreenshotDescription}`;
    } else {
      userMessage = prompt;
    }

    const newChat = await prisma.chat.update({
      where: { id: chat.id },
      data: {
        title,
        messages: {
          createMany: {
            data: [
              { role: "system", content: getMainCodingPrompt(mode, !!fullScreenshotDescription), position: 0 },
              { role: "user", content: userMessage, position: 1 },
            ],
          },
        },
      },
      include: { messages: true },
    });

    const lastMessage = newChat.messages.sort((a, b) => a.position - b.position).at(-1);
    if (!lastMessage) throw new Error("No new message");

    logGeneration({
      chatId: chat.id,
      model: resolvedModel,
      input: { prompt, hasScreenshot: !!screenshotUrl, quality, mode },
      output: userMessage,
      metadata: { type: "initial_generation", title },
    });

    return NextResponse.json({ chatId: chat.id, lastMessageId: lastMessage.id });
  } catch (error) {
    console.error("Error creating chat:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const message = isDev && error instanceof Error ? `Failed to create chat: ${error.message}` : "Failed to create chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
