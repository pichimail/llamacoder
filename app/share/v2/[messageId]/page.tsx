import CodeRunner from "@/components/code-runner";
import { getPrisma } from "@/lib/prisma";
import { getOgDataForChat } from "@/lib/og-utils";
import { extractAllCodeBlocks } from "@/lib/utils";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ messageId: string }>;
}): Promise<Metadata> {
  let { messageId } = await params;
  const message = await getMessage(messageId);
  if (!message) {
    notFound();
  }

  const title = message.chat.title;
  const { ogImageUrl } = getOgDataForChat(
    {
      id: message.chat.id,
      title: message.chat.title,
      prompt: message.chat.prompt,
      messages: [
        ...(message.chat.messages ?? []),
        {
          id: message.id,
          role: message.role,
          content: message.content,
          files: message.files,
          previewImageUrl: message.previewImageUrl,
        },
      ],
    },
    messageId,
  );

  return {
    title,
    description: `An app generated on Chinna-Coder: ${title}`,
    openGraph: {
      images: [ogImageUrl],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
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

  const prisma = getPrisma();
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    notFound();
  }

  const storedFiles = message.files as Array<{
    path?: string;
    code?: string;
    content?: string;
    language?: string;
  }> | null;
  const files =
    storedFiles && Array.isArray(storedFiles) && storedFiles.length > 0
      ? storedFiles.map((file) => ({
          path: file.path || "App.tsx",
          code: file.code || file.content || "",
          language: file.language,
        }))
      : extractAllCodeBlocks(message.content);
  if (files.length === 0 || files.every((file) => !file.code?.trim())) {
    notFound();
  }

  return (
    <div className="flex h-full w-full grow flex-col">
      <div className="flex h-full grow items-center justify-center">
        <CodeRunner
          files={files.map((f) => ({ path: f.path, content: f.code }))}
        />
      </div>

      {/* Floating desktop banner */}
      <div className="fixed bottom-4 right-4 z-50 hidden md:block">
        <a
          className="inline-flex shrink-0 items-center rounded-full border-[0.5px] border-[#BABABA] bg-white px-3.5 py-1.5 text-xs text-black shadow-lg transition-shadow hover:shadow-sm dark:border-white/20 dark:bg-zinc-900 dark:text-white"
          href="/"
        >
          <span className="text-center">
            Shared on <span className="font-semibold">Chinna-Coder</span>
          </span>
        </a>
      </div>
    </div>
  );
}

const getMessage = cache(async (messageId: string) => {
  const prisma = getPrisma();
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      chat: {
        include: {
          messages: {
            where: { role: "user" },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
    },
  });
});
