'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireChatAccess, requireCurrentUser, requireProjectAccess } from '@/lib/authz'
import { getPrisma } from '@/lib/prisma'

const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional().nullable(),
})

function touchProjectPaths(projectId?: string) {
  revalidatePath('/chats')
  if (projectId) revalidatePath(`/projects/${projectId}`)
}

export type ProjectOverview = Awaited<ReturnType<typeof getProjectOverview>>

export async function getProjectOverview() {
  const prisma = getPrisma()
  const user = await requireCurrentUser()

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      chats: {
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          prompt: true,
          model: true,
          isPinned: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
        },
      },
      _count: {
        select: {
          chats: true,
          files: true,
          deployments: true,
          members: true,
        },
      },
    },
  })

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    counts: project._count,
    chats: project.chats.map((chat) => ({
      ...chat,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    })),
  }))
}

export async function createProject(input: z.infer<typeof projectSchema>) {
  const data = projectSchema.parse(input)
  const prisma = getPrisma()
  const user = await requireCurrentUser()

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      userId: user.id,
    },
  })

  touchProjectPaths(project.id)
  return project
}

export async function updateProject(projectId: string, input: Partial<z.infer<typeof projectSchema>>) {
  await requireProjectAccess(projectId, 'editor')
  const data = projectSchema.partial().parse(input)
  const prisma = getPrisma()

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
    },
  })

  touchProjectPaths(projectId)
  return project
}

export async function deleteProject(projectId: string) {
  await requireProjectAccess(projectId, 'owner')
  const prisma = getPrisma()
  await prisma.project.delete({ where: { id: projectId } })
  touchProjectPaths()
  return { ok: true }
}

export async function moveChatToProject(chatId: string, projectId: string | null) {
  const { chat } = await requireChatAccess(chatId, 'editor')
  if (projectId) {
    await requireProjectAccess(projectId, 'editor')
  }
  const prisma = getPrisma()
  const updated = await prisma.chat.update({
    where: { id: chat.id },
    data: { projectId },
  })

  revalidatePath('/chats')
  revalidatePath(`/chats/${chatId}`)
  return updated
}
