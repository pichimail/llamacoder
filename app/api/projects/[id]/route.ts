import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { deleteProject, updateProject } from '@/app/actions/projects'
import { authErrorResponse } from '@/lib/authz'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).optional().nullable(),
  isFavorite: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid project payload' }, { status: 400 })
  }

  try {
    const project = await updateProject(id, parsed.data)
    return NextResponse.json({ ok: true, project })
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string }
  try {
    await deleteProject(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return authErrorResponse(error)
  }
}
