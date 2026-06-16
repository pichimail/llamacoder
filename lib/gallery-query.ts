import "server-only";

import { getPrisma } from "@/lib/prisma";
import { getMergedFeaturedApps } from "@/lib/featured-apps-server";
import { MOTION_TEMPLATES } from "@/lib/motion-templates";
import { FEATURED_APPS } from "@/lib/featured-apps";

export type GalleryFilters = {
  source?: "all" | "featured" | "community" | "motion" | "templates";
  model?: string;
  minFiles?: number;
};

export type GalleryBuild = {
  id: string;
  title: string;
  model: string;
  shareMessageId?: string;
  fileCount: number;
  source: "community" | "pinned";
  createdAt?: Date;
};

function normalizeModel(model: string) {
  return model.split("/").pop()?.toLowerCase() || model.toLowerCase();
}

export async function getGalleryCommunityBuilds(
  filters: GalleryFilters,
): Promise<GalleryBuild[]> {
  const prisma = getPrisma();
  const minFiles = filters.minFiles ?? 0;

  const chats = await prisma.chat
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 48,
      where: filters.model
        ? {
            model: {
              contains: filters.model,
              mode: "insensitive",
            },
          }
        : undefined,
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        messages: {
          where: { role: "assistant" },
          orderBy: { position: "desc" },
          take: 1,
          select: { id: true, files: true, content: true },
        },
      },
    })
    .catch(() => []);

  return chats
    .map((chat) => {
      const message = chat.messages[0];
      const storedCount = Array.isArray(message?.files)
        ? (message!.files as unknown[]).length
        : 0;
      const blockCount = message?.content.includes("```") ? 1 : 0;
      const fileCount = storedCount || blockCount;

      return {
        id: chat.id,
        title: chat.title || "Untitled build",
        model: normalizeModel(chat.model),
        shareMessageId: message?.id,
        fileCount,
        source: "community" as const,
        createdAt: chat.createdAt,
      };
    })
    .filter((build) => build.shareMessageId && build.fileCount >= minFiles);
}

export async function getGalleryFeaturedCount() {
  const merged = await getMergedFeaturedApps();
  return merged.length + MOTION_TEMPLATES.length + FEATURED_APPS.length;
}

export function modelFilterOptions() {
  return ["glm", "qwen", "minimax", "deepseek", "claude", "llama", "openrouter"];
}