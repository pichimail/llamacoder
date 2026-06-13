import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import Together from "together-ai";
import { z } from "zod";
import { resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";

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
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid request body",
        },
        { status: 400 },
      );
    }
    const { prompt, model, quality, screenshotUrl, mode, attachments } = parsed.data;
    const resolvedModel = resolveModel(model);
    const promptWithAttachments = `${prompt}${attachmentContext(attachments)}`;

    // Fail fast with clear messages if required secrets are missing
    if (!process.env.DATABASE_URL) {
      console.error("Missing DATABASE_URL environment variable");
      return NextResponse.json(
        { error: "Server misconfiguration: missing database URL" },
        { status: 500 },
      );
    }
    if (!process.env.TOGETHER_API_KEY) {
      console.error("Missing TOGETHER_API_KEY environment variable");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Together AI API key" },
        { status: 500 },
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

    let options: ConstructorParameters<typeof Together>[0] = {};
    if (process.env.HELICONE_API_KEY) {
      options.baseURL = "https://together.helicone.ai/v1";
      options.defaultHeaders = {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-appname": "LlamaCoder",
        "Helicone-Session-Id": chat.id,
        "Helicone-Session-Name": "LlamaCoder Chat",
      };
    }

    const together = new Together(options);

    // Title generation is non-critical — always provide a fallback so we don't 500 the whole creation
    let title = promptWithAttachments.trim().split(/\s+/).slice(0, 6).join(" ");
    if (title.length > 60) title = title.slice(0, 57) + "...";
    try {
      const responseForChatTitle = await together.chat.completions.create({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
          },
          {
            role: "user",
            content: promptWithAttachments,
          },
        ],
      });
      const aiTitle = responseForChatTitle.choices?.[0]?.message?.content?.trim();
      if (aiTitle && aiTitle.length > 0 && aiTitle.length < 100) {
        title = aiTitle;
      }
    } catch (titleErr) {
      console.warn("Failed to generate AI title, using fallback from prompt:", titleErr);
    }

    let fullScreenshotDescription;
    if (screenshotUrl) {
      try {
        const screenshotResponse = await together.chat.completions.create({
          model: "moonshotai/Kimi-K2.5",
          reasoning: { enabled: false },
          temperature: 0.4,
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: screenshotToCodePrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: screenshotUrl,
                  },
                },
              ],
            },
          ],
        });

        fullScreenshotDescription =
          screenshotResponse.choices[0].message?.content;
      } catch (err) {
        console.warn("Screenshot processing failed, continuing without it:", err);
      }
    }

    let userMessage: string;
    if (quality === "high") {
      // High-quality plan generation is important but we still want to avoid hard 500s
      let planContent: string | undefined;
      try {
        const initialRes = await together.chat.completions.create({
          model: "Qwen/Qwen3-Coder-Next-FP8",
          messages: [
            {
              role: "system",
              content: softwareArchitectPrompt,
            },
            {
              role: "user",
              content: fullScreenshotDescription
                ? fullScreenshotDescription + promptWithAttachments
                : promptWithAttachments,
            },
          ],
          temperature: 0.4,
          max_tokens: 3000,
        });

        planContent = initialRes.choices?.[0]?.message?.content ?? undefined;
        if (planContent) {
          console.log("PLAN:", planContent);
        }
      } catch (planErr) {
        console.warn("High quality plan generation failed, falling back to raw prompt:", planErr);
      }
      userMessage = planContent ?? promptWithAttachments;
    } else if (fullScreenshotDescription) {
      userMessage =
        promptWithAttachments +
        "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
        fullScreenshotDescription;
    } else {
      userMessage = promptWithAttachments;
    }

    let newChat = await prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        title,
        messages: {
          create: [
            {
              role: "system",
              content: getMainCodingPrompt(mode, !!fullScreenshotDescription),
              position: 0,
            },
            {
              role: "user",
              content: userMessage,
              position: 1,
              ...(attachments.length > 0
                ? {
                    files: attachments as Prisma.InputJsonValue,
                  }
                : {}),
            },
          ],
        },
      },
      include: {
        messages: true,
      },
    });

    const lastMessage = newChat.messages
      .sort((a, b) => a.position - b.position)
      .at(-1);
    if (!lastMessage) throw new Error("No new message");

    // Log initial generation to Braintrust for evals & measurement over time
    logGeneration({
      chatId: chat.id,
      model: resolvedModel,
      input: { prompt, hasScreenshot: !!screenshotUrl, quality, mode },
      output: userMessage, // the enriched prompt that was used
      metadata: { type: "initial_generation", title },
    });

    return NextResponse.json({
      chatId: chat.id,
      lastMessageId: lastMessage.id,
    });
  } catch (error) {
    console.error("Error creating chat:", error);

    // In development / preview, surface the real error to make debugging easy.
    // In production we keep the generic message.
    const isDev = process.env.NODE_ENV !== "production";
    const message =
      isDev && error instanceof Error
        ? `Failed to create chat: ${error.message}`
        : "Failed to create chat";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
