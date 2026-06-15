import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { normalizeArtifactFiles } from '@/lib/artifact-analysis'
import { SharePreviewClient } from '@/components/chats/share-preview-client'

export default async function ShareVersionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prisma = getPrisma()
  const message = await prisma.message.findUnique({
    where: { id },
    include: { chat: true },
  })

  if (!message || message.role !== 'assistant') notFound()

  const files = normalizeArtifactFiles(message.files)
  if (!files.length) notFound()

  return <SharePreviewClient title={message.chat.title || 'Shared app'} files={files} />
}

export const runtime = 'edge'
