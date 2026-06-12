export type AppUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  role?: string | null
}

export type AppSession = {
  user: AppUser
} | null

export async function auth(): Promise<AppSession> {
  // Auth provider is not fully wired in this branch yet.
  // Keep this typed so server actions can add ownership checks safely now
  // and become strict automatically when a real session provider is connected.
  return null
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth()
  return session?.user ?? null
}
