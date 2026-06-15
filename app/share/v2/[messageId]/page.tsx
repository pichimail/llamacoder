import { getPrisma } from "@/lib/prisma";
import { normalizeArtifactFiles } from "@/lib/artifact-analysis";
import { SharePreviewClient } from "@/components/chats/share-preview-client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ messageId: string }>;
}): Promise<Metadata> {
  const { messageId } = await params;
  const message = await getMessage(messageId);
  if (!message) {
    notFound();
  }

  const title = message.chat.title;
  const searchParams = new URLSearchParams();
  searchParams.set("prompt", title);

  return {
    title,
    description: `An app generated on Chinna-Coder: ${title}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/og?${searchParams}`],
      title,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const { messageId } = await params;
  const message = await getMessage(messageId);
  if (!message || message.role !== "assistant") {
    notFound();
  }

  const files = normalizeArtifactFiles(message.files);
  if (files.length === 0) {
    notFound();
  }

  return <SharePreviewClient title={message.chat.title || "Shared app"} files={files} />;
}

const getMessage = cache(async (messageId: string) => {
  const prisma = getPrisma();
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      chat: true,
    },
  });
});

export const runtime = "edge";
