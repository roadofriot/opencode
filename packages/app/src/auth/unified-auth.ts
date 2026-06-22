import type { AuthProvider, AuthUser, AuthState } from "./types"
import {
  initSupabaseService,
  signInWithSupabase,
  getSupabaseSessionToken,
  listenSupabaseAuth,
  signOutSupabase,
  isSupabaseConfigured,
} from "./supabase-service"
import { initGitHubService, clearGitHubService } from "./github-service"
import { initFirebase, signInToFirebase, signOutFirebase } from "./firebase-service"

type StateChangeCallback = (state: AuthState) => void

const listeners = new Set<StateChangeCallback>()

let state: AuthState = {
  user: null,
  supabaseToken: null,
  gitHubToken: null,
  isInitialized: false,
}

function notify() {
  const s = { ...state }
  for (const cb of listeners) cb(s)
}

let unlistenSupabase: (() => void) | null = null

function connectSupabaseListener() {
  unlistenSupabase?.()
  unlistenSupabase = listenSupabaseAuth((user) => {
    if (user) {
      state = { ...state, user, supabaseToken: null }
      getSupabaseSessionToken().then((token) => {
        if (token) {
          state = { ...state, supabaseToken: token }
          notify()
          void connectDerivedServices(token, user.provider)
        } else {
          notify()
        }
      })
    } else {
      state = { ...state, user: null, supabaseToken: null, gitHubToken: null }
      clearGitHubService()
      notify()
    }
  })
}

async function connectDerivedServices(supabaseToken: string, provider: AuthProvider) {
  const ghToken = import.meta.env.VITE_GITHUB_ACCESS_TOKEN
  if (ghToken) {
    initGitHubService(ghToken)
    state = { ...state, gitHubToken: ghToken }
  }

  const firebaseOk = await initFirebase()
  if (firebaseOk && supabaseToken) {
    await signInToFirebase(supabaseToken).catch(() => {})
  }
}

export async function initializeAuth(): Promise<AuthState> {
  if (isSupabaseConfigured()) {
    connectSupabaseListener()

    const user = await initSupabaseService("google")
    if (user) {
      state = { ...state, user, isInitialized: true }
      notify()
      return state
    }
  }

  state = { ...state, isInitialized: true }
  notify()
  return state
}

export async function signIn(provider: AuthProvider): Promise<void> {
  if (isDesktop()) {
    const { default: desktopAuth } = await import("./desktop-auth")
    try {
      await desktopAuth.signIn(provider)
    } catch (e) {
      console.error("Desktop sign-in failed:", e)
      throw e
    }
    return
  }

  if (isSupabaseConfigured()) {
    try {
      await signInWithSupabase(provider)
    } catch (e) {
      console.error("Supabase sign-in failed:", e)
      throw e
    }
    return
  }

  throw new Error(
    "No authentication configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
    "in your .env file, or run the desktop app with those environment variables set."
  )
}

export async function signOut(): Promise<void> {
  clearGitHubService()

  if (isDesktop()) {
    const { default: desktopAuth } = await import("./desktop-auth")
    await desktopAuth.signOut().catch(() => {})
  }

  await Promise.allSettled([signOutSupabase(), signOutFirebase()])

  state = { user: null, supabaseToken: null, gitHubToken: null, isInitialized: true }
  notify()
}

export function getAuthState(): AuthState {
  return { ...state }
}

export function subscribeToAuth(callback: StateChangeCallback): () => void {
  listeners.add(callback)
  if (state.isInitialized) callback({ ...state })
  return () => listeners.delete(callback)
}

function isDesktop(): boolean {
  if (typeof window === "undefined") return false
  return "api" in window && window.api != null && "auth" in (window.api as any)
}

export function isAuthConfigured(): boolean {
  return isSupabaseConfigured() || isDesktop()
}
