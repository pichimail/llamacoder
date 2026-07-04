import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Copy, Send } from 'lucide-react'

import { getSharedPrompt } from '@/app/actions/prompt-library'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SharedPromptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const prompt = await getSharedPrompt(token)
  if (!prompt) notFound()

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Link href="/library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to library
        </Link>
        <Card className="rounded-lg">
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Shared prompt</p>
            <CardTitle className="text-2xl">{prompt.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{prompt.category}</span>
              <span>{prompt.tone}</span>
              <span>{prompt.useCount} uses</span>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/35 p-4 text-sm leading-6">{prompt.body}</pre>
            <div className="flex flex-wrap gap-2">
              <Link href={`/?prompt=${encodeURIComponent(prompt.body)}`}>
                <Button className="gap-2">
                  <Send className="size-4" />
                  Use this prompt
                </Button>
              </Link>
              <Button variant="outline" className="gap-2 bg-transparent" disabled>
                <Copy className="size-4" />
                Copy from page text
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
