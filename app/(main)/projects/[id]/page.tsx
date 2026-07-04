import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, MessageSquare, PackageOpen } from 'lucide-react'

import { requireProjectAccess } from '@/lib/authz'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { prisma, project } = await requireProjectAccess(id, 'viewer').catch(() => ({ prisma: null, project: null }))
  if (!prisma || !project) notFound()

  const chats = await prisma.chat.findMany({
    where: { projectId: project.id },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      prompt: true,
      model: true,
      isPinned: true,
      isArchived: true,
      updatedAt: true,
    },
  })

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <Link href={`/chats?project=${project.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to chat control
        </Link>
        <header className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Project route</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description || 'This project is ready for chats, files, deployments, and shared workspace controls.'}</p>
            </div>
            <Link href="/">
              <Button className="gap-2">
                New chat
                <ExternalLink className="size-4" />
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <ProjectMetric label="Chats" value={chats.length} />
          <ProjectMetric label="Active" value={chats.filter((chat) => !chat.isArchived).length} />
          <ProjectMetric label="Pinned" value={chats.filter((chat) => chat.isPinned).length} />
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Project chats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chats.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <PackageOpen className="mx-auto size-8 text-muted-foreground" />
                  <EmptyTitle>No chats in this project yet</EmptyTitle>
                  <EmptyDescription>Move chats into this project from the control center or start a new build.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              chats.map((chat) => (
                <Link key={chat.id} href={`/chats/${chat.id}`} className="block rounded-md border border-border p-3 transition hover:border-foreground/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{chat.title}</h2>
                    <span className="text-xs text-muted-foreground">{chat.model}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{chat.prompt}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
