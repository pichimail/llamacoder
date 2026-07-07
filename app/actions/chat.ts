'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
  getScopedChatListWhere,
  requireChatAccess,
  requireCurrentUser,
} from '@/lib/authz'
import { getPrisma } from '@/lib/prisma'

async function getScopedChatOrThrow(chatId: string, level: 'viewer' | 'editor' | 'owner' = 'viewer') {
  const { chat } = await requireChatAccess(chatId, level)
  return chat
}

async function ensureCanMutateChat(chatId: string) {
  return getScopedChatOrThrow(chatId, 'editor')
}

function touchChatPaths(chatId?: string) {
  revalidatePath('/chats')
  if (chatId) revalidatePath(`/chats/${chatId}`)
}

export async function createChat(data: {
  title: string
  prompt: string
  model: string
  mcpServers?: Array<{ id: string; name: string; url?: string; transport?: string }> | null
}) {
  const prisma = getPrisma()
  const user = await requireCurrentUser()

  const project = await prisma.project.create({
    data: {
      name: data.title || 'Untitled App',
      description: data.prompt || null,
      userId: user.id,
    },
  })

  const chat = await prisma.chat.create({
    data: {
      title: data.title,
      prompt: data.prompt,
      model: data.model,
      quality: 'high',
      shadcn: false,
      llamaCoderVersion: 'v2',
      projectId: project.id,
      mcpServers: data.mcpServers && data.mcpServers.length > 0 ? (data.mcpServers as Prisma.InputJsonValue) : Prisma.JsonNull,
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

  const [messages, originalProject] = await Promise.all([
    prisma.message.findMany({
      where: { chatId },
      orderBy: { position: 'asc' },
    }),
    originalChat.projectId
      ? prisma.project.findUnique({
          where: { id: originalChat.projectId },
          include: {
            files: true,
            envVars: true,
            integrations: true,
            domains: true,
          },
        })
      : null,
  ])

  const duplicatedMessages: Prisma.MessageCreateWithoutChatInput[] = messages.map(
    (msg, index) => ({
      role: msg.role,
      content: msg.content,
      position: index,
      ...(msg.files === null ? {} : { files: msg.files as Prisma.InputJsonValue }),
    }),
  )

  const duplicatedProject = originalProject
    ? await prisma.project.create({
        data: {
          name: `${originalProject.name} (Copy)`,
          description: originalProject.description,
          userId: originalProject.userId,
          files: {
            create: originalProject.files.map((file) => ({
              path: file.path,
              content: file.content,
            })),
          },
          envVars: {
            create: originalProject.envVars.map((env) => ({
              key: env.key,
              value: env.value,
            })),
          },
          integrations: {
            create: originalProject.integrations.map((integration) => ({
              type: integration.type,
              config: integration.config as Prisma.InputJsonValue,
            })),
          },
          domains: {
            create: originalProject.domains.map((domain) => ({
              domain: domain.domain,
              verified: domain.verified,
            })),
          },
        },
      })
    : null

  const newChat = await prisma.chat.create({
    data: {
      title: `${originalChat.title} (Copy)`,
      prompt: originalChat.prompt,
      model: originalChat.model,
      quality: originalChat.quality,
      shadcn: originalChat.shadcn,
      llamaCoderVersion: originalChat.llamaCoderVersion,
      projectId: duplicatedProject?.id,
      messages: {
        create: duplicatedMessages,
      },
    },
  })

  touchChatPaths(newChat.id)
  return newChat
}

export async function getChatsList() {
  const prisma = getPrisma()
  const where = await getScopedChatListWhere({ includeArchived: true })

  const chats = await prisma.chat.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })

  const pinned = chats.filter((chat) => chat.isPinned)
  const recent = chats.filter((chat) => !chat.isPinned && !chat.isArchived).slice(0, 20)

  return { pinned, recent, all: chats }
}

export async function getChatById(chatId: string) {
  return getScopedChatOrThrow(chatId, 'viewer')
}

export async function getChat(id: string) {
  return getScopedChatOrThrow(id, 'viewer')
}
