'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/app/auth'
import { getPrisma } from '@/lib/prisma'

async function getScopedChatOrThrow(chatId: string) {
  const prisma = getPrisma()
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      project: {
        include: {
          members: true,
        },
      },
    },
  })

  if (!chat) throw new Error('Chat not found')
  return chat
}

async function ensureCanMutateChat(chatId: string) {
  const chat = await getScopedChatOrThrow(chatId)

  // Legacy chats in this repo may not have a project/user owner yet.
  // Keep them usable until the auth provider and project assignment flow are wired.
  if (!chat.project) return chat

  const user = await getCurrentUser()
  if (!user?.id) throw new Error('Unauthorized')

  const isOwner = chat.project.userId === user.id
  const isMember = chat.project.members.some((member) => member.userId === user.id)

  if (!isOwner && !isMember) throw new Error('Forbidden')
  return chat
}

function touchChatPaths(chatId?: string) {
  revalidatePath('/chats')
  if (chatId) revalidatePath(`/chats/${chatId}`)
}

export async function createChat(data: {
  title: string
  prompt: string
  model: string
}) {
  const prisma = getPrisma()

  const chat = await prisma.chat.create({
    data: {
      title: data.title,
      prompt: data.prompt,
      model: data.model,
      quality: 'high',
      shadcn: true,
      llamaCoderVersion: 'v2',
    },
  })

  touchChatPaths(chat.id)
  return chat
}

export async function renameChat(chatId: string, newTitle: string) {
  await ensureCanMutateChat(chatId)
  const prisma = getPrisma()

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { title: newTitle },
  })

  touchChatPaths(chatId)
  return chat
}

export async function updateChatTitle(chatId: string, title: string) {
  return renameChat(chatId, title)
}

export async function deleteChat(chatId: string) {
  await ensureCanMutateChat(chatId)
  const prisma = getPrisma()

  await prisma.chat.delete({
    where: { id: chatId },
  })

  touchChatPaths()
  return { success: true }
}

export async function pinChat(chatId: string, isPinned: boolean) {
  await ensureCanMutateChat(chatId)
  const prisma = getPrisma()

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { isPinned },
  })

  touchChatPaths(chatId)
  return chat
}

export async function toggleChatPin(chatId: string) {
  const chat = await ensureCanMutateChat(chatId)
  return pinChat(chatId, !chat.isPinned)
}

export async function archiveChat(chatId: string, isArchived: boolean) {
  await ensureCanMutateChat(chatId)
  const prisma = getPrisma()

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: { isArchived },
  })

  touchChatPaths(chatId)
  return chat
}

export async function toggleChatArchive(chatId: string) {
  const chat = await ensureCanMutateChat(chatId)
  return archiveChat(chatId, !chat.isArchived)
}

export async function duplicateChat(chatId: string) {
  const originalChat = await ensureCanMutateChat(chatId)
  const prisma = getPrisma()

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { position: 'asc' },
  })

  const newChat = await prisma.chat.create({
    data: {
      title: `${originalChat.title} (Copy)`,
      prompt: originalChat.prompt,
      model: originalChat.model,
      quality: originalChat.quality,
      shadcn: originalChat.shadcn,
      llamaCoderVersion: originalChat.llamaCoderVersion,
      projectId: originalChat.projectId,
      messages: {
        create: messages.map((msg, index) => ({
          role: msg.role,
          content: msg.content,
          files: msg.files ?? null,
          position: index,
        })),
      },
    },
  })

  touchChatPaths(newChat.id)
  return newChat
}

export async function getChatsList() {
  const prisma = getPrisma()
  const user = await getCurrentUser()

  const chats = await prisma.chat.findMany({
    where: user?.id
      ? {
          OR: [
            { project: null },
            { project: { userId: user.id } },
            { project: { members: { some: { userId: user.id } } } },
          ],
        }
      : undefined,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })

  const pinned = chats.filter((chat) => chat.isPinned)
  const recent = chats.filter((chat) => !chat.isPinned && !chat.isArchived).slice(0, 20)

  return { pinned, recent, all: chats }
}

export async function getChatById(chatId: string) {
  const prisma = getPrisma()

  return prisma.chat.findUnique({
    where: { id: chatId },
  })
}

export async function getChat(id: string) {
  const prisma = getPrisma()
  const chat = await prisma.chat.findUnique({
    where: { id },
    include: {
      messages: true,
      project: {
        include: {
          files: true,
          envVars: true,
          integrations: true,
          domains: true,
          members: true,
        },
      },
    },
  })

  if (!chat) throw new Error('Chat not found')

  if (chat.project) {
    const user = await getCurrentUser()
    if (!user?.id) throw new Error('Unauthorized')

    const isOwner = chat.project.userId === user.id
    const isMember = chat.project.members.some((member) => member.userId === user.id)
    if (!isOwner && !isMember) throw new Error('Forbidden')
  }

  return chat
}
