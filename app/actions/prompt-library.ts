'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { z } from 'zod'

import { AuthzError, getCurrentUserOrNull, requireCurrentUser } from '@/lib/authz'
import { getPrisma } from '@/lib/prisma'

const promptSchema = z.object({
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(12000),
  category: z.string().trim().min(1).max(80).default('General'),
  tone: z.string().trim().min(1).max(80).default('Balanced'),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  variables: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
})

export type PromptLibraryInput = z.input<typeof promptSchema>

function normalizeJsonList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

async function requirePromptOwner(promptId: string) {
  const prisma = getPrisma()
  const user = await requireCurrentUser()
  const prompt = await prisma.promptLibraryItem.findUnique({ where: { id: promptId } })
  if (!prompt) throw new AuthzError(404, 'Prompt not found')
  if (prompt.userId !== user.id && !user.isAdmin) throw new AuthzError(403, 'Forbidden')
  return { prisma, user, prompt }
}

export async function getPromptLibrary(options: { query?: string; category?: string; limit?: number } = {}) {
  const prisma = getPrisma()
  const user = await getCurrentUserOrNull()  // allow unauthenticated (home page calls this)
  const query = options.query?.trim()
  const category = options.category?.trim()

  const prompts = await prisma.promptLibraryItem.findMany({
    where: {
      ...(user ? { userId: user.id } : { visibility: { in: ['public', 'team'] } }),
      ...(category && category !== 'all' ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { body: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              { tone: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: options.limit ?? 100,
  })

  return prompts.map(serializePrompt)
}

export async function getSharedPrompt(token: string) {
  const prisma = getPrisma()
  const prompt = await prisma.promptLibraryItem.findFirst({
    where: {
      shareToken: token,
      visibility: { in: ['team', 'public'] },
    },
  })
  return prompt ? serializePrompt(prompt) : null
}

export async function createPromptLibraryItem(input: PromptLibraryInput) {
  const data = promptSchema.parse(input)
  const prisma = getPrisma()
  const user = await requireCurrentUser()
  const shareToken = data.visibility === 'private' ? null : nanoid(18)

  const prompt = await prisma.promptLibraryItem.create({
    data: {
      title: data.title,
      body: data.body,
      category: data.category,
      tone: data.tone,
      visibility: data.visibility,
      shareToken,
      tags: normalizeJsonList(data.tags) as Prisma.InputJsonValue,
      variables: normalizeJsonList(data.variables) as Prisma.InputJsonValue,
      userId: user.id,
    },
  })

  revalidatePath('/library')
  return serializePrompt(prompt)
}

export async function updatePromptLibraryItem(promptId: string, input: Partial<PromptLibraryInput>) {
  const { prisma } = await requirePromptOwner(promptId)
  const data = promptSchema.partial().parse(input)
  const visibility = data.visibility

  const current = await prisma.promptLibraryItem.findUniqueOrThrow({ where: { id: promptId } })
  const nextShareToken =
    visibility && visibility !== 'private' && !current.shareToken
      ? nanoid(18)
      : visibility === 'private'
        ? null
        : current.shareToken

  const prompt = await prisma.promptLibraryItem.update({
    where: { id: promptId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.tone !== undefined ? { tone: data.tone } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility, shareToken: nextShareToken } : {}),
      ...(data.tags !== undefined ? { tags: normalizeJsonList(data.tags) as Prisma.InputJsonValue } : {}),
      ...(data.variables !== undefined ? { variables: normalizeJsonList(data.variables) as Prisma.InputJsonValue } : {}),
    },
  })

  revalidatePath('/library')
  return serializePrompt(prompt)
}

export async function deletePromptLibraryItem(promptId: string) {
  const { prisma } = await requirePromptOwner(promptId)
  await prisma.promptLibraryItem.delete({ where: { id: promptId } })
  revalidatePath('/library')
  return { ok: true }
}

export async function incrementPromptUse(promptId: string) {
  const { prisma } = await requirePromptOwner(promptId)
  const prompt = await prisma.promptLibraryItem.update({
    where: { id: promptId },
    data: { useCount: { increment: 1 } },
  })
  revalidatePath('/library')
  return serializePrompt(prompt)
}

function serializePrompt(prompt: {
  id: string
  title: string
  body: string
  category: string
  tone: string
  tags: Prisma.JsonValue | null
  variables: Prisma.JsonValue | null
  visibility: string
  shareToken: string | null
  useCount: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    category: prompt.category,
    tone: prompt.tone,
    tags: Array.isArray(prompt.tags) ? prompt.tags.filter((item): item is string => typeof item === 'string') : [],
    variables: Array.isArray(prompt.variables) ? prompt.variables.filter((item): item is string => typeof item === 'string') : [],
    visibility: prompt.visibility,
    shareToken: prompt.shareToken,
    useCount: prompt.useCount,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  }
}
