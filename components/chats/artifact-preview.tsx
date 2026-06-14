'use client'

import dynamic from 'next/dynamic'
import type { ArtifactFile } from '@/lib/artifact-analysis'
import type { WorkspacePreviewMode } from './workspace-context'

const CodeRunner = dynamic(() => import('@/components/code-runner'), { ssr: false })

export function ArtifactPreview({
  files,
  previewMode,
}: {
  files: ArtifactFile[]
  previewMode: WorkspacePreviewMode
}) {
  if (!files.length) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-semibold text-foreground">No files yet</p>
          <p className="text-sm text-muted-foreground">Send a prompt to generate the first artifact.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <CodeRunner
        files={files.map((file) => ({ path: file.path, content: file.code }))}
        previewMode={previewMode}
        showDeviceToggle={false}
      />
    </div>
  )
}
