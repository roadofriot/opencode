import { getClient } from "./client"
import type { AuthResponse, User } from "@supabase/supabase-js"

export type AuthProvider = "github" | "google"

export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  const client = getClient()
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: globalThis?.location?.origin ? `${globalThis.location.origin}/auth/callback` : undefined,
    },
  })
  if (error) throw error
  return data as any
}

export async function signOut(): Promise<void> {
  const client = getClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getClient()
  const { data } = await client.auth.getUser()
  return data?.user ?? null
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const client = getClient()
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data?.subscription.unsubscribe()
}

export async function getSessionToken(): Promise<string | null> {
  const client = getClient()
  const { data } = await client.auth.getSession()
  return data?.session?.access_token ?? null
}
