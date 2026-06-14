'use client'

import { createContext, useContext } from 'react'
import type { ChatMode } from './mode-switcher'

export type WorkspacePreviewMode = 'web' | 'mobile'

export type WorkspaceContextValue = {
  mode: ChatMode
  previewMode: WorkspacePreviewMode
  hideNestedChrome: boolean
  latestMessageId?: string
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  mode: 'preview',
  previewMode: 'web',
  hideNestedChrome: false,
})

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue
  children: React.ReactNode
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspaceShell() {
  return useContext(WorkspaceContext)
}
