import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type ChatMode = 'preview' | 'code' | 'design' | 'database'
export type RightPanelTab = 'share' | 'settings'

interface UIState {
  currentMode: ChatMode
  setMode: (mode: ChatMode) => void
  
  rightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  setRightPanel: (open: boolean, tab?: RightPanelTab) => void
  
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  selectedFile: string | null
  setSelectedFile: (path: string | null) => void
  
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        currentMode: 'preview' as ChatMode,
        setMode: (mode) => set({ currentMode: mode }),

        rightPanelOpen: false,
        rightPanelTab: 'share',
        setRightPanel: (open, tab) =>
          set((state) => ({
            rightPanelOpen: open,
            rightPanelTab: tab || state.rightPanelTab,
          })),

        sidebarCollapsed: false,
        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        selectedFile: null,
        setSelectedFile: (path) => set({ selectedFile: path }),

        expandedFolders: new Set(),
        toggleFolder: (path) =>
          set((state) => {
            const expanded = new Set(state.expandedFolders)
            if (expanded.has(path)) {
              expanded.delete(path)
            } else {
              expanded.add(path)
            }
            return { expandedFolders: expanded }
          }),
      }),
      {
        name: 'chat-ui-store',
      }
    )
  )
)
