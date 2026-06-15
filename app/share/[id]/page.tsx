import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import CodeRunner from "@/components/code-runner";
import { getPrisma } from "@/lib/prisma";
import { normalizeArtifactFiles } from "@/lib/artifact-analysis";
import { SharePreviewClient } from "@/components/chats/share-preview-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const generatedApp = await getGeneratedAppByID(id);
  const sharedMessage = generatedApp ? null : await getMessageByID(id);
  const prompt = generatedApp?.prompt || sharedMessage?.chat?.title;

  if (typeof prompt !== "string") {
    notFound();
  }

  const searchParams = new URLSearchParams();
  searchParams.set("prompt", prompt);

  return {
    title: "An app generated on Chinna-Coder",
    description: `Prompt: ${prompt}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
    twitter: {
      title: "An app generated on Chinna-Coder",
      card: "summary_large_image",
      images: [`/api/og?${searchParams}`],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (typeof id !== "string") {
    notFound();
  }

  const generatedApp = await getGeneratedAppByID(id);

  if (generatedApp) {
    return (
      <div className="flex h-full w-full grow items-center justify-center">
        <CodeRunner language="tsx" code={generatedApp.code} showDeviceToggle={false} />
      </div>
    );
  }

  const message = await getMessageByID(id);
  if (!message || message.role !== "assistant") notFound();

  const files = normalizeArtifactFiles(message.files);
  if (!files.length) notFound();

  return <SharePreviewClient title={message.chat.title || "Shared app"} files={files} />;
}

const getGeneratedAppByID = cache(async (id: string) => {
  const prisma = getPrisma();
  return prisma.generatedApp.findUnique({
    where: {
      id,
    },
  });
});

const getMessageByID = cache(async (id: string) => {
  const prisma = getPrisma();
  return prisma.message.findUnique({
    where: { id },
    include: { chat: true },
  });
});
