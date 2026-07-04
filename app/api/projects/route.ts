import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createProject, getProjectOverview } from '@/app/actions/projects'
import { authErrorResponse } from '@/lib/authz'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional().nullable(),
})

export async function GET() {
  try {
    const projects = await getProjectOverview()
    return NextResponse.json({ projects })
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid project payload' }, { status: 400 })
  }

  try {
    const project = await createProject(parsed.data)
    return NextResponse.json({ ok: true, project })
  } catch (error) {
    return authErrorResponse(error)
  }
}
