'use server';

import { getPrisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createChat(data: {
  title: string;
  prompt: string;
  model: string;
}) {
  const prisma = getPrisma();
  
  const chat = await prisma.chat.create({
    data: {
      title: data.title,
      prompt: data.prompt,
      model: data.model,
      quality: 'high',
      shadcn: true,
      llamaCoderVersion: 'v2',
    },
  });

  revalidatePath('/chats');
  return chat;
}

export async function renameChat(chatId: string, newTitle: string) {
  const prisma = getPrisma();

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { title: newTitle },
  });

  revalidatePath('/chats');
  revalidatePath(`/chats/${chatId}`);
  return chat;
}

export async function deleteChat(chatId: string) {
  const prisma = getPrisma();

  await prisma.chat.delete({
    where: { id: chatId },
  });

  revalidatePath('/chats');
  return { success: true };
}

export async function pinChat(chatId: string, isPinned: boolean) {
  const prisma = getPrisma();

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { isPinned },
  });

  revalidatePath('/chats');
  return chat;
}

export async function archiveChat(chatId: string, isArchived: boolean) {
  const prisma = getPrisma();

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { isArchived },
  });

  revalidatePath('/chats');
  return chat;
}

export async function duplicateChat(chatId: string) {
  const prisma = getPrisma();

  const originalChat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!originalChat) throw new Error('Chat not found');

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { position: 'asc' },
  });

  const newChat = await prisma.chat.create({
    data: {
      title: `${originalChat.title} (Copy)`,
      prompt: originalChat.prompt,
      model: originalChat.model,
      quality: originalChat.quality,
      shadcn: originalChat.shadcn,
      llamaCoderVersion: originalChat.llamaCoderVersion,
      messages: {
        create: messages.map((msg, index) => ({
          role: msg.role,
          content: msg.content,
          files: msg.files ?? null,
          position: index,
        })),
      },
    },
  });

  revalidatePath('/chats');
  return newChat;
}

export async function getChatsList() {
  const prisma = getPrisma();

  const chats = await prisma.chat.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const pinned = chats.filter((c) => c.isPinned);
  const recent = chats.filter((c) => !c.isPinned && !c.isArchived).slice(0, 20);

  return { pinned, recent, all: chats };
}

export async function getChatById(chatId: string) {
  const prisma = getPrisma();

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  return chat;
}
