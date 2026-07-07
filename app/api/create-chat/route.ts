import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getMainCodingPrompt } from "@/lib/prompts";
import { z } from "zod";
import { assertValidModel } from "@/lib/constants";
import { logGeneration } from "@/lib/braintrust";
import { anyProviderConfigured } from "@/lib/providers/generation";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { buildPhaseOneSpec } from "@/lib/build-engine";
import { seedBuildArtifacts } from "@/lib/build-workspace";
import { requireCurrentUser } from "@/lib/authz";
import { assertCanCreateProject, assertFeatureAllowed, PlanLimitError, planErrorResponseBody } from "@/lib/plan";
import { logAudit } from "@/lib/audit";
import { DEFAULT_STYLE_ID } from "@/lib/sandbox-theme";

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
  styleId: z.string().trim().max(64).optional().default(DEFAULT_STYLE_ID),
  designPresetId: z.string().trim().max(64).optional(),
  aiIntegration: z.enum(["chinnallm", "byok", "skip"]).optional().nullable().default(null),
  aiCapabilities: z.array(z.string().max(24)).max(10).optional().default([]),
  backendMode: z.boolean().optional().default(false),
  mcpServers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        transport: z.string().optional(),
      })
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
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
    }

    const user = await requireCurrentUser();

    const { prompt, model, quality, screenshotUrl, mode, attachments, shadcn, styleId, designPresetId, aiIntegration, aiCapabilities, backendMode, mcpServers } = parsed.data;

    let customDesign: { content: string; instructions?: string } | null = null;
    if (designPresetId) {
      try {
        const preset = await getPrisma().designPreset.findFirst({
          where: { id: designPresetId, userId: user.id },
          select: { content: true, instructions: true },
        });
        if (preset) customDesign = { content: preset.content, instructions: preset.instructions ?? undefined };
      } catch (e) {
        console.warn("designPreset lookup failed (table may be missing migration):", e);
      }
    }

    let resolvedModel: string;
    try {
      resolvedModel = assertValidModel(model);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid model" }, { status: 400 });
    }
    if (!anyProviderConfigured()) {
      return NextResponse.json({ error: "Server misconfiguration: configure the platform generation provider key" }, { status: 500 });
    }

    const prisma = getPrisma();

    type VerifiedAttachment = { kind: "image" | "file"; filename: string; url?: string; size?: number; uploadId?: string };
    // Verify attachments belong to this user (upload IDs or owned blob URLs)
    const verifiedAttachments: VerifiedAttachment[] = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.url) {
          const existing = await prisma.fileUpload.findFirst({
            where: { blobUrl: att.url, userId: user.id },
          });
          if (!existing) {
            return NextResponse.json({ error: "Unowned attachment URL rejected" }, { status: 403 });
          }
          verifiedAttachments.push({ ...att, uploadId: existing.id });
          // link later
        } else if ((att as unknown as { uploadId?: string }).uploadId) {
          const up = await prisma.fileUpload.findUnique({ where: { id: (att as unknown as { uploadId: string }).uploadId } });
          if (!up || up.userId !== user.id) {
            return NextResponse.json({ error: "Unowned upload ID rejected" }, { status: 403 });
          }
          verifiedAttachments.push(att);
        }
      }
    }

    const promptWithAttachments = `${prompt}${attachmentContext(attachments)}`;
    const buildSpec = buildPhaseOneSpec({ prompt: promptWithAttachments, mode, shadcn, backendMode });

    if (!process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing database URL" }, { status: 500 });
    }

    try {
      await rateLimitOrThrow(`create-chat:${user.id}`, { limit: 18, windowSeconds: 60 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limited" }, { status: 429 });
    }

    // Priority 2: plan enforcement. Cap projects per plan and gate backend mode
    // before any rows are written.
    try {
      await assertCanCreateProject(user.id);
      if (buildSpec.backendMode) await assertFeatureAllowed(user.id, "backendMode");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return NextResponse.json(planErrorResponseBody(error), { status: error.status });
      }
      throw error;
    }

    const project = await prisma.project.create({
      data: {
        name: buildSpec.title || "Untitled App",
        description: promptWithAttachments || null,
        userId: user.id,
      },
    });

    const chat = await prisma.chat.create({
      data: {
        model: resolvedModel,
        quality,
        prompt,
        title: buildSpec.title,
        shadcn,
        styleId,
        project: { connect: { id: project.id } },
        aiIntegration: aiIntegration ?? null,
        backendMode: buildSpec.backendMode,
        // mcpServers added via migration; include only if provided to avoid column errors on old DBs
        ...( (mcpServers && mcpServers.length > 0) ? { mcpServers: mcpServers as Prisma.InputJsonValue } : {} ),
      },
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
                  styleId,
                  aiIntegration,
                  aiCapabilities,
                  customDesign,
                  mcpServers,
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

    // Link verified uploads to chat
    if (verifiedAttachments.length > 0) {
      for (const va of verifiedAttachments) {
        const upId = va.uploadId;
        if (upId) {
          await prisma.fileUpload.update({ where: { id: upId }, data: { chatId: chat.id } }).catch(() => {});
        }
      }
    }

    const lastMessage = newChat.messages.sort((a, b) => a.position - b.position).at(-1);
    if (!lastMessage) throw new Error("No new message");

    const seededArtifacts = await seedBuildArtifacts(
      chat.id,
      buildSpec.title,
      promptWithAttachments,
      buildSpec.artifactFiles,
    );

    await logAudit({ userId: user.id, action: "create-chat", resource: "chat", resourceId: chat.id });

    logGeneration({
      chatId: chat.id,
      model: resolvedModel,
      input: { prompt, hasScreenshot: !!screenshotUrl, quality, mode, userId: user.id },
      output: userMessage,
      metadata: { type: "initial_generation", title: buildSpec.title, template: buildSpec.templateId, backendMode: buildSpec.backendMode },
    });

    return NextResponse.json({
      id: chat.id,
      chatId: chat.id,
      lastMessageId: lastMessage.id,
      buildSpec,
      artifacts: buildSpec.artifactFiles,
      seededArtifacts,
    });
  } catch (error) {
    if ((error as any)?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating chat:", error);
    const isDev = process.env.NODE_ENV !== "production";
    const message = isDev && error instanceof Error ? `Failed to create chat: ${error.message}` : "Failed to create chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
