import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import Together from "together-ai";
import { resolveModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";

function optimizeMessagesForTokens(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  // Keep system + first user + last 2 full assistant messages (with code).
  // For older assistants, strip all code blocks and keep only a very short summary of intent.
  const assistantIndices: number[] = [];
  for (
    let i = messages.length - 1;
    i >= 0 && assistantIndices.length < 2;
    i--
  ) {
    if (messages[i].role === "assistant") {
      assistantIndices.push(i);
    }
  }

  return messages.map((msg, index) => {
    if (msg.role === "assistant" && !assistantIndices.includes(index)) {
      // Keep only the non-code text + a one-line intent summary
      let text = msg.content.replace(/```[\s\S]*?```/g, "").trim();
      // Extract a tiny summary from the beginning if present
      const firstLine =
        text.split("\n").find((l) => l.trim().length > 10) || "";
      const summary = firstLine.slice(0, 120);
      return {
        ...msg,
        content: summary
          ? `[Previous version summary: ${summary}]`
          : "[earlier version omitted]",
      };
    }
    return msg;
  });
}

/**
 * Use a small, cheap model (Llama 3.3 70B) to compress long chat history.
 * This retains the "what happened" essence for good memory management without blowing up context.
 */
async function compressHistoryWithSmallModel(
  together: Together,
  oldMessages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  if (oldMessages.length === 0) return "";

  const historyText = oldMessages
    .map(
      (m, i) =>
        `${i + 1}. ${m.role.toUpperCase()}: ${m.content.slice(0, 800)}${
          m.content.length > 800 ? "..." : ""
        }`,
    )
    .join("\n\n");

  try {
    const summaryRes = await together.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", // Small/cheap model for compression as requested
      messages: [
        {
          role: "system",
          content:
            "You are an expert conversation compressor. Summarize the chat history below into a concise, information-dense paragraph (max 350 tokens). Focus on: user's original goal, key decisions/features requested, what was built so far, any errors or iterations, and current state. Preserve specific technical details and user intent. Output ONLY the summary paragraph.",
        },
        {
          role: "user",
          content: historyText,
        },
      ],
      temperature: 0.2,
      max_tokens: 700,
    });

    const summary = summaryRes.choices?.[0]?.message?.content?.trim();
    return summary || "Previous conversation involved iterative app building based on user feedback.";
  } catch (err) {
    console.warn("History compression with small model failed, using fallback:", err);
    // Fallback crude summary
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
});

export async function POST(req: Request) {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }
  const { messageId, model } = parsed.data;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return new Response(null, { status: 404 });
  }

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  let options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
      "Helicone-Session-Id": message.chatId,
      "Helicone-Session-Name": "LlamaCoder Chat",
    };
  }

  const together = new Together(options);

  // Re-apply smart compression using the small model (Llama 3.3 70B) now that Together client exists
  if (messages.length > 8) {
    const systemMsg = messages[0];
    const firstUser = messages[1];
    const recent = messages.slice(-6);

    const toCompress = messages.slice(2, -6).filter(
      (m) => m.role === "user" || m.role === "assistant",
    );

    let compressedSummary = "";
    if (toCompress.length > 0) {
      compressedSummary = await compressHistoryWithSmallModel(together, toCompress as any);
    }

    messages = [
      systemMsg,
      firstUser,
      ...(compressedSummary
        ? [
            {
              role: "system" as const,
              content: `[COMPRESSED HISTORY SUMMARY - retain this context for the rest of the conversation]:\n${compressedSummary}`,
            },
          ]
        : []),
      ...recent,
    ];
  }

  // Log to Braintrust for evals (input, model, output will be the streamed result)
  logGeneration({
    chatId: message.chatId,
    model: resolveModel(model),
    input: { messagesCount: messages.length, lastUser: messages[messages.length - 2]?.content?.slice(0, 300) },
    output: "[streamed]", // actual code captured downstream if needed
    metadata: { type: "followup", messageId },
  });

  const res = await together.chat.completions.create({
    model: resolveModel(model),
    reasoning: { enabled: false },
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: 0.4,
    max_tokens: 9000,
  });

  return new Response(res.toReadableStream());
}

export const runtime = "edge";
export const maxDuration = 300;
