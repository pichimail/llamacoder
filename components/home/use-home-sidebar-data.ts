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
  isAdmin?: boolean
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
  email: "Sign in with Google",
  avatar: "",
  isAdmin: false,
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
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
        const settings = await fetchJsonWithTimeout("/api/public-settings")
        const authOn = !!(settings?.saasMode && settings?.googleAuth)
        let sessionUser: any = null

        if (authOn) {
          const session = await fetchJsonWithTimeout("/api/auth/session")
          sessionUser = session?.user ?? null
        }

        const chatsResult = sessionUser || !authOn ? await getChatsList() : { pinned: [], recent: [] }

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
        setAuthEnabled(authOn)

        if (!authOn) {
          setUser({ name: "Guest", email: "Open build mode", avatar: "", isAdmin: false })
          setIsAuthenticated(false)
          return
        }

        if (sessionUser) {
          setUser({
            name: sessionUser.name || "Account",
            email: sessionUser.email || "Signed in",
            avatar: sessionUser.image || "",
            isAdmin: sessionUser.role === "admin" || sessionUser.isAdmin === true,
          })
          setIsAuthenticated(true)
        } else {
          setUser(guestUser)
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
