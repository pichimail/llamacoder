import { NextRequest, NextResponse } from 'next/server'

import { createPromptLibraryItem, getPromptLibrary } from '@/app/actions/prompt-library'
import { authErrorResponse } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  try {
    const prompts = await getPromptLibrary({
      query: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      limit: Number(searchParams.get('limit') || 100),
    })
    return NextResponse.json({ prompts })
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const prompt = await createPromptLibraryItem(await request.json())
    return NextResponse.json({ ok: true, prompt })
  } catch (error) {
    return authErrorResponse(error)
  }
}
