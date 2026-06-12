import { cookies } from 'next/headers'

export async function auth() {
  // TODO: Implement proper auth (Auth.js, Clerk, etc.)
  // For now, return null for public access
  return null
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
