'use client'

import dynamic from 'next/dynamic'
import { ExternalLink, Moon } from 'lucide-react'
import type { ArtifactFile } from '@/lib/artifact-analysis'

const CodeRunner = dynamic(() => import('@/components/code-runner'), { ssr: false })

export function SharePreviewClient({
  title,
  files,
}: {
  title: string
  files: ArtifactFile[]
}) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-3">
        <div className="min-w-0 truncate text-sm font-semibold">Hyperspeed</div>
        <div className="truncate rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          {title}
        </div>
        <div className="flex justify-end gap-1">
          <a
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open builder
          </a>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground" aria-label="Theme">
            <Moon className="h-4 w-4" />
          </button>
        </div>
      </header>
      <section className="min-h-0 flex-1 overflow-hidden">
        {files.length ? (
          <CodeRunner
            files={files.map((file) => ({ path: file.path, content: file.code }))}
            previewMode="web"
            showDeviceToggle={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            This shared version has no renderable files.
          </div>
        )}
      </section>
    </main>
  )
}
