import { NextRequest, NextResponse } from 'next/server'

import {
  deletePromptLibraryItem,
  incrementPromptUse,
  updatePromptLibraryItem,
} from '@/app/actions/prompt-library'
import { authErrorResponse } from '@/lib/authz'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string }
  try {
    const prompt = await updatePromptLibraryItem(id, await request.json())
    return NextResponse.json({ ok: true, prompt })
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string }
  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === 'use') {
      const prompt = await incrementPromptUse(id)
      return NextResponse.json({ ok: true, prompt })
    }
    if (body.action === 'share') {
      const prompt = await updatePromptLibraryItem(id, { visibility: 'public' })
      return NextResponse.json({ ok: true, prompt })
    }
    if (body.action === 'unshare') {
      const prompt = await updatePromptLibraryItem(id, { visibility: 'private' })
      return NextResponse.json({ ok: true, prompt })
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
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
    await deletePromptLibraryItem(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return authErrorResponse(error)
  }
}
