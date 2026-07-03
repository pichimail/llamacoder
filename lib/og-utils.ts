import "server-only";

import { domain } from "@/lib/domain";
import {
  buildOgImagePath,
  getShareScreenshotUrl as buildShareScreenshotUrl,
} from "@/lib/og-shared";

type AttachmentFile = {
  kind?: string;
  url?: string;
  filename?: string;
};

type MessageWithFiles = {
  id?: string;
  role: string;
  content: string;
  files?: unknown;
  previewImageUrl?: string | null;
};

type ChatForOg = {
  id: string;
  title: string;
  prompt: string;
  messages?: MessageWithFiles[];
};

export function extractAttachmentImageUrl(
  files: unknown,
): string | undefined {
  if (!files || !Array.isArray(files)) return undefined;
  for (const file of files as AttachmentFile[]) {
    if (file.kind === "image" && file.url) return file.url;
    if (file.url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(file.url)) {
      return file.url;
    }
  }
  return undefined;
}

export function getShareScreenshotUrl(messageId: string): string {
  return buildShareScreenshotUrl(domain, messageId);
}

export function buildOgImageUrl(params: {
  prompt: string;
  messageId?: string;
}): string {
  return buildOgImagePath(params);
}

export function getOgDataForChat(chat: ChatForOg, messageId?: string) {
  const prompt = chat.prompt?.trim() || chat.title?.trim() || "Built with Chinna-Coder";
  const messages = chat.messages ?? [];

  const targetMessage = messageId
    ? messages.find((m) => (m as { id?: string }).id === messageId)
    : [...messages].reverse().find((m) => m.role === "assistant");

  const firstUser = messages.find((m) => m.role === "user");
  const attachmentImage = firstUser
    ? extractAttachmentImageUrl(firstUser.files)
    : undefined;

  const previewImage =
    (targetMessage as { previewImageUrl?: string | null })?.previewImageUrl ??
    undefined;

  const resolvedMessageId =
    messageId ?? (targetMessage as { id?: string })?.id ?? undefined;

  const image = previewImage || attachmentImage || (resolvedMessageId ? getShareScreenshotUrl(resolvedMessageId) : undefined);

  return {
    prompt,
    messageId: resolvedMessageId,
    image,
    ogImageUrl: buildOgImageUrl({
      prompt,
      messageId: resolvedMessageId,
    }),
  };
}
