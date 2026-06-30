"use server";

import { requireChatAccess } from "@/lib/access-control";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any[],
) {
  const { prisma } = await requireChatAccess(chatId, "editor");
  const maxPosition = await prisma.message.aggregate({
    where: { chatId },
    _max: { position: true },
  });

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      files: files ? JSON.parse(JSON.stringify(files)) : null,
      position: (maxPosition._max.position ?? -1) + 1,
      chatId,
    },
  });

  return newMessage;
}
