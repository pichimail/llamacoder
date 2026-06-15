"use client"

import { useEffect, useState } from "react"

import { getChatsList } from "@/app/actions/chat"

export type HomeSidebarChat = {
  id: string
  title: string
  isPinned: boolean
}

export type HomeSidebarUser = {
  name: string
  email: string
  avatar: string
}

type HomeSidebarData = {
  chats: HomeSidebarChat[]
  user: HomeSidebarUser
  authEnabled: boolean
  isAuthenticated: boolean
  loading: boolean
}

const guestUser: HomeSidebarUser = {
  name: "Guest",
  email: "Open build mode",
  avatar: "",
}

export function useHomeSidebarData(): HomeSidebarData {
  const [chats, setChats] = useState<HomeSidebarChat[]>([])
  const [user, setUser] = useState<HomeSidebarUser>(guestUser)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [settingsRes, chatsResult] = await Promise.all([
          fetch("/api/public-settings", { cache: "no-store" }),
          getChatsList(),
        ])

        if (cancelled) return

        const pinned = chatsResult.pinned.map((chat) => ({
          id: chat.id,
          title: chat.title,
          isPinned: chat.isPinned,
        }))
        const recent = chatsResult.recent
          .filter((chat) => !pinned.some((item) => item.id === chat.id))
          .map((chat) => ({
            id: chat.id,
            title: chat.title,
            isPinned: chat.isPinned,
          }))

        setChats([...pinned, ...recent].slice(0, 8))

        const settings = settingsRes.ok ? await settingsRes.json() : null
        const saasEnabled = !!(settings?.saasMode && settings?.googleAuth)
        setAuthEnabled(saasEnabled)

        if (!saasEnabled) {
          setUser(guestUser)
          setIsAuthenticated(false)
          return
        }

        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const sessionUser = session?.user

        if (sessionUser) {
          setUser({
            name: sessionUser.name || "Account",
            email: sessionUser.email || "Signed in",
            avatar: sessionUser.image || "",
          })
          setIsAuthenticated(true)
        } else {
          setUser({
            name: "Guest",
            email: "Sign in to sync chats",
            avatar: "",
          })
          setIsAuthenticated(false)
        }
      } catch {
        if (!cancelled) {
          setChats([])
          setUser(guestUser)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { chats, user, authEnabled, isAuthenticated, loading }
}