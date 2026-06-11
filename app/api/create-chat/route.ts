import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import Together from "together-ai";
import { resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model,
      quality = "low",
      screenshotUrl,
      mode = "agent",
    } = body;
    const resolvedModel = resolveModel(model);

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
    let title = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
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
            content: prompt,
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
                ? fullScreenshotDescription + prompt
                : prompt,
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
      userMessage = planContent ?? prompt;
    } else if (fullScreenshotDescription) {
      userMessage =
        prompt +
        "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
        fullScreenshotDescription;
    } else {
      userMessage = prompt;
    }

    let newChat = await prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        title,
        messages: {
          createMany: {
            data: [
              {
                role: "system",
                content: getMainCodingPrompt(mode, !!fullScreenshotDescription),
                position: 0,
              },
              { role: "user", content: userMessage, position: 1 },
            ],
          },
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
