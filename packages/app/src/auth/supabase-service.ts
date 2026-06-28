import { initSupabase, getClient, type SupabaseConfig } from "@mindsparq-ai/supabase/client"
import { getCurrentUser, getSessionToken, onAuthStateChange, signOut as supabaseSignOut } from "@mindsparq-ai/supabase/auth"
import type { AuthProvider, AuthUser } from "./types"

let initialized = false

function getConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

function supabaseUserToAuthUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, provider: AuthProvider): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    provider,
  }
}

export function initSupabaseService(provider: AuthProvider): Promise<AuthUser | null> {
  initialized = true
  const config = getConfig()
  if (!config) return Promise.resolve(null)

  initSupabase(config)
  return getCurrentUser().then((user) => {
    if (!user) return null
    return supabaseUserToAuthUser(user, provider)
  })
}

export async function signInWithSupabase(provider: AuthProvider): Promise<AuthUser | null> {
  const config = getConfig()
  if (!config) return null

  initSupabase(config)

  if (typeof window !== "undefined" && "api" in window && (window as any).api?.auth) {
    return null
  }

  const { signInWithProvider } = await import("@mindsparq-ai/supabase/auth")
  try {
    await signInWithProvider(provider)
  } catch (e) {
    console.warn("Supabase web sign-in failed:", e)
  }
  return null
}

export async function getSupabaseSessionToken(): Promise<string | null> {
  if (!initialized) return null
  try {
    return await getSessionToken()
  } catch {
    return null
  }
}

export function listenSupabaseAuth(callback: (user: AuthUser | null) => void): () => void {
  if (!initialized) {
    const config = getConfig()
    if (!config) return () => {}
    initSupabase(config)
  }

  return onAuthStateChange((supabaseUser) => {
    if (!supabaseUser) {
      callback(null)
      return
    }
    const id = supabaseUser.app_metadata?.provider
    const provider: AuthProvider = id === "github" ? "github" : "google"
    callback(supabaseUserToAuthUser(supabaseUser, provider))
  })
}

export async function signOutSupabase(): Promise<void> {
  if (!initialized) return
  try {
    await supabaseSignOut()
  } catch {}
}

export function isSupabaseConfigured(): boolean {
  return getConfig() !== null
}
