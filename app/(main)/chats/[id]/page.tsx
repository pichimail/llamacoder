import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";
import { EnhancedPage } from "@/components/chats/enhanced-page";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const chat = await getChatById(resolvedParams.id);

  if (!chat) {
    return {
      title: "Chat not found",
      description: "The requested chat could not be found.",
    };
  }

  return {
    title: `App: ${chat.title}`,
    description: `Building an app for ${chat.title} with ${chat.model}`,
    openGraph: {
      title: `App: ${chat.title}`,
      description: `Building an app for ${chat.title} with ${chat.model}`,
      type: "website",
      images: [`/api/og?prompt=${encodeURIComponent(chat.title)}`],
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const id = (await params).id;
  const [chat, sidebarChats] = await Promise.all([getChatById(id), getSidebarChats()]);

  if (!chat) notFound();

  return (
    <EnhancedPage chatId={id} chatTitle={chat.title} chats={sidebarChats}>
      <PageClient chat={chat} />
    </EnhancedPage>
  );
}

const getSidebarChats = cache(async () => {
  const prisma = getPrisma();
  const chats = await prisma.chat.findMany({
    where: { isArchived: false },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      isPinned: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    isPinned: chat.isPinned,
    createdAt: chat.createdAt.toISOString(),
    projectName: chat.project?.name ?? "Personal",
  }));
});

const getChatById = cache(async (id: string) => {
  const prisma = getPrisma();
  const chat = await prisma.chat.findFirst({
    where: { id },
  });

  if (!chat) return null;

  const totalMessages = await prisma.message.count({
    where: { chatId: id },
  });

  const initialMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { in: [0, 1] },
    },
    orderBy: { position: "asc" },
  });

  const recentMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { gte: 2 },
    },
    orderBy: { position: "desc" },
    take: 100,
  });

  const allMessages = [...initialMessages, ...recentMessages].sort(
    (a, b) => a.position - b.position,
  );

  const assistantMessagesInLoaded = allMessages.filter(
    (m) => m.role === "assistant",
  );
  let assistantMessagesCountBefore = 0;
  if (assistantMessagesInLoaded.length > 0) {
    const minPosition = Math.min(
      ...assistantMessagesInLoaded.map((m) => m.position),
    );
    assistantMessagesCountBefore = await prisma.message.count({
      where: {
        chatId: id,
        role: "assistant",
        position: { lt: minPosition },
      },
    });
  }

  return {
    ...chat,
    messages: allMessages,
    totalMessages,
    assistantMessagesCountBefore,
  };
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const runtime = "edge";
export const maxDuration = 45;
