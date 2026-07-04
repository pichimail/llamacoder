import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUserOrNull } from '@/lib/authz'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const quickActions = [
  { id: 'new-chat', type: 'action', title: 'New Chat', subtitle: 'Start a fresh build conversation', href: '/', icon: 'plus' },
  { id: 'new-project', type: 'action', title: 'New Project', subtitle: 'Create a workspace for related chats', href: '/projects?action=new-project', icon: 'folder' },
  { id: 'projects', type: 'navigation', title: 'Projects', subtitle: 'Open the projects dashboard', href: '/projects', icon: 'grid' },
  { id: 'all-chats', type: 'navigation', title: 'All Recent Chats', subtitle: 'Search and organize generated chats', href: '/chats', icon: 'clock' },
  { id: 'library', type: 'navigation', title: 'Prompt Library', subtitle: 'Save, reuse, and share prompts', href: '/library', icon: 'book' },
  { id: 'settings', type: 'navigation', title: 'Account Settings', subtitle: 'Builder defaults and account controls', href: '/settings', icon: 'settings' },
]

function containsQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase())
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const prisma = getPrisma()
  const user = await getCurrentUserOrNull()
  const filteredActions = quickActions.filter((item) => !query || containsQuery(`${item.title} ${item.subtitle}`, query))

  if (!user) {
    return NextResponse.json({
      quickActions: filteredActions,
      projects: [],
      chats: [],
      prompts: [],
    })
  }

  const projectAccessWhere = user.isAdmin
    ? {}
    : {
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      }

  const [projects, chats, prompts] = await Promise.all([
    prisma.project.findMany({
      where: {
        AND: [
          projectAccessWhere,
          query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' as const } },
                  { description: { contains: query, mode: 'insensitive' as const } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        name: true,
        description: true,
        isFavorite: true,
        updatedAt: true,
        _count: { select: { chats: true } },
      },
    }),
    prisma.chat.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' as const } },
                { prompt: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(user.isAdmin
          ? {}
          : {
              project: {
                OR: [
                  { userId: user.id },
                  { members: { some: { userId: user.id } } },
                ],
              },
            }),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        title: true,
        prompt: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
    }),
    prisma.promptLibraryItem.findMany({
      where: {
        userId: user.id,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' as const } },
                { body: { contains: query, mode: 'insensitive' as const } },
                { category: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        updatedAt: true,
      },
    }),
  ])

  return NextResponse.json({
    quickActions: filteredActions,
    projects: projects.map((project) => ({
      id: project.id,
      title: project.name,
      subtitle: project.description || `${project._count.chats} chats`,
      href: `/projects/${project.id}`,
      isFavorite: project.isFavorite,
      updatedAt: project.updatedAt.toISOString(),
    })),
    chats: chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      subtitle: chat.project?.name || chat.prompt,
      href: `/chats/${chat.id}`,
      updatedAt: chat.updatedAt.toISOString(),
    })),
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      subtitle: prompt.category,
      href: `/library?prompt=${prompt.id}`,
      updatedAt: prompt.updatedAt.toISOString(),
    })),
  })
}
