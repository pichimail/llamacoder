'use server'

import { getPrisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ChatMode = 'preview' | 'code' | 'design' | 'database'

export async function getChat(id: string) {
  try {
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
          },
        },
      },
    })

    if (!chat) throw new Error('Chat not found')
    return chat
  } catch (error) {
    console.error('[getChat]', error)
    throw error
  }
}

export async function updateChatTitle(chatId: string, title: string) {
  try {
    const prisma = getPrisma()
    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    })

    revalidatePath('/chats')
    revalidatePath(`/chats/${chatId}`)
    return chat
  } catch (error) {
    console.error('[updateChatTitle]', error)
    throw error
  }
}

export async function toggleChatPin(chatId: string) {
  try {
    const prisma = getPrisma()
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    })

    if (!chat) throw new Error('Chat not found')

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { isPinned: !chat.isPinned },
    })

    revalidatePath('/chats')
    return updated
  } catch (error) {
    console.error('[toggleChatPin]', error)
    throw error
  }
}

export async function toggleChatArchive(chatId: string) {
  try {
    const prisma = getPrisma()
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    })

    if (!chat) throw new Error('Chat not found')

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { isArchived: !chat.isArchived },
    })

    revalidatePath('/chats')
    return updated
  } catch (error) {
    console.error('[toggleChatArchive]', error)
    throw error
  }
}

export async function deleteChat(chatId: string) {
  try {
    const prisma = getPrisma()
    await prisma.chat.delete({
      where: { id: chatId },
    })

    revalidatePath('/chats')
    return { success: true }
  } catch (error) {
    console.error('[deleteChat]', error)
    throw error
  }
}

export async function duplicateChat(chatId: string) {
  try {
    const prisma = getPrisma()
    const original = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { messages: true },
    })

    if (!original) throw new Error('Chat not found')

    const newChat = await prisma.chat.create({
      data: {
        title: `${original.title} (Copy)`,
        model: original.model,
        quality: original.quality,
        prompt: original.prompt,
        llamaCoderVersion: original.llamaCoderVersion,
        shadcn: original.shadcn,
        projectId: original.projectId,
        messages: {
          create: original.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            files: msg.files ?? null,
            position: msg.position,
          })),
        },
      },
    })

    revalidatePath('/chats')
    return newChat
  } catch (error) {
    console.error('[duplicateChat]', error)
    throw error
  }
}

export async function renameChat(chatId: string, newTitle: string) {
  try {
    const prisma = getPrisma()
    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { title: newTitle },
    })

    revalidatePath('/chats')
    revalidatePath(`/chats/${chatId}`)
    return updated
  } catch (error) {
    console.error('[renameChat]', error)
    throw error
  }
}
