import "server-only";

import { getPrisma } from "@/lib/prisma";
import {
  FEATURED_APPS,
  type FeaturedApp,
  getFeaturedAppBySlug,
} from "@/lib/featured-apps";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function pinToFeaturedApp(pin: {
  id: string;
  slug: string;
  messageId: string;
  title: string;
  description: string;
  prompt: string;
  tags: unknown;
}): FeaturedApp {
  const tags = Array.isArray(pin.tags)
    ? pin.tags.filter((tag): tag is string => typeof tag === "string")
    : ["Pinned", "Community"];

  return {
    slug: pin.slug,
    title: pin.title,
    description: pin.description,
    prompt: pin.prompt || pin.title,
    tags,
    messageId: pin.messageId,
    pinned: true,
    pinId: pin.id,
  };
}

export async function getPinnedFeaturedApps(): Promise<FeaturedApp[]> {
  const prisma = getPrisma();
  try {
    const pins = await prisma.featuredPin.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return pins.map(pinToFeaturedApp);
  } catch {
    return [];
  }
}

export async function getMergedFeaturedApps(): Promise<FeaturedApp[]> {
  const pinned = await getPinnedFeaturedApps();
  const pinnedSlugs = new Set(pinned.map((app) => app.slug));

  const staticApps = FEATURED_APPS.filter(
    (app) => !pinnedSlugs.has(app.slug) && !app.messageId,
  ).map((app) => ({ ...app, source: "template" as const }));

  return [
    ...pinned.map((app) => ({ ...app, source: "pinned" as const })),
    ...staticApps,
  ];
}

export async function getFeaturedAppBySlugAsync(
  slug: string,
): Promise<FeaturedApp | undefined> {
  const normalized = slug.toLowerCase().trim();
  const prisma = getPrisma();

  try {
    const pin = await prisma.featuredPin.findUnique({
      where: { slug: normalized },
    });
    if (pin) return pinToFeaturedApp(pin);
  } catch {
    // table may not exist before migrate
  }

  return getFeaturedAppBySlug(normalized);
}

export async function createFeaturedPin(input: {
  messageId: string;
  title?: string;
  description?: string;
  prompt?: string;
  slug?: string;
  tags?: string[];
}) {
  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    include: { chat: true },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const hasFiles =
    (Array.isArray(message.files) && (message.files as unknown[]).length > 0) ||
    message.content.includes("```");

  if (!hasFiles) {
    throw new Error("Message has no generated files to feature");
  }

  const title = input.title?.trim() || message.chat.title || "Featured app";
  const baseSlug = input.slug?.trim() || slugify(title);
  let slug = baseSlug || `featured-${message.id.slice(0, 8)}`;

  const existingSlug = await prisma.featuredPin.findUnique({ where: { slug } });
  if (existingSlug && existingSlug.messageId !== input.messageId) {
    slug = `${slug}-${message.id.slice(0, 6)}`;
  }

  return prisma.featuredPin.upsert({
    where: { messageId: input.messageId },
    create: {
      slug,
      messageId: input.messageId,
      title,
      description:
        input.description?.trim() ||
        message.chat.prompt.slice(0, 240) ||
        "Pinned community generation",
      prompt: input.prompt?.trim() || message.chat.prompt,
      tags: input.tags ?? ["Pinned", "Community"],
      sortOrder: 0,
    },
    update: {
      title,
      description: input.description?.trim() || undefined,
      prompt: input.prompt?.trim() || undefined,
      tags: input.tags ?? undefined,
    },
  });
}

export async function deleteFeaturedPin(id: string) {
  const prisma = getPrisma();
  return prisma.featuredPin.delete({ where: { id } });
}