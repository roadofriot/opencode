import { createSignal, createContext, useContext, onMount, type ParentProps, type Accessor } from "solid-js"
import { supabase, isSupabaseConfigured } from "../lib/auth/client"
import { showToast } from "@mindsparq-ai/ui/toast"

export type AuthUser = {
  id: string
  email?: string
  name?: string
  avatar?: string
  provider: string
}

export type AuthConnection = {
  name: string
  icon: string
  connected: boolean
  description: string
}

type AuthContextValue = {
  user: Accessor<AuthUser | null>
  isAuthenticated: Accessor<boolean>
  isLoading: Accessor<boolean>
  connections: Accessor<AuthConnection[]>
  signIn: (provider: "google" | "github") => Promise<void>
  signOut: () => Promise<void>
  showLogin: Accessor<boolean>
  setShowLogin: (show: boolean) => void
  skipAuth: () => void
  userStatus: Accessor<"active" | "busy" | "away">
  setUserStatus: (status: "active" | "busy" | "away") => void
}

const AuthContext = createContext<AuthContextValue>()

export function AuthProvider(props: ParentProps) {
  const [user, setUser] = createSignal<AuthUser | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [showLogin, setShowLogin] = createSignal(false)
  const [userStatus, _setUserStatus] = createSignal<"active" | "busy" | "away">(
    (localStorage.getItem("mindsparq_user_status") as any) ?? "active"
  )

  const isAuthenticated = () => user() !== null

  const setUserStatus = (status: "active" | "busy" | "away") => {
    _setUserStatus(status)
    localStorage.setItem("mindsparq_user_status", status)
  }

  const connections = (): AuthConnection[] => [
    { name: "Google", icon: "google", connected: user()?.provider === "google", description: "Primary sign-in" },
    { name: "GitHub", icon: "github", connected: user()?.provider === "github", description: "Code repositories" },
    { name: "Supabase", icon: "database", connected: isSupabaseConfigured(), description: "Data sync" },
  ]

  const mapSupabaseUser = (sbUser: any): AuthUser => {
    const identities = sbUser.identities || []
    const provider = identities[0]?.provider || "email"
    const metadata = sbUser.user_metadata || {}
    return {
      id: sbUser.id,
      email: sbUser.email,
      name: metadata.full_name || metadata.name || sbUser.email,
      avatar: metadata.avatar_url || metadata.picture,
      provider,
    }
  }

  onMount(async () => {
    if (isSupabaseConfigured()) {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
      }

      // Listen to auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUser(session.user))
          setShowLogin(false)
        } else {
          setUser(null)
          const hasSkipped = localStorage.getItem("mindsparq-auth-skipped") === "true"
          if (!hasSkipped) {
            setShowLogin(true)
          }
        }
      })
    }

    const hasSkipped = localStorage.getItem("mindsparq-auth-skipped") === "true"
    if (!user() && !hasSkipped) {
      setShowLogin(true)
    }

    setIsLoading(false)
  })

  const signIn = async (provider: "google" | "github") => {
    if (!isSupabaseConfigured()) {
      showToast({
        title: "Configuration Error",
        description: "Supabase authentication keys are missing in the environment.",
        variant: "error",
      })
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OAuth sign in failed"
      showToast({
        title: "Authentication failed",
        description: msg,
        variant: "error",
      })
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
    localStorage.removeItem("mindsparq-auth-skipped")
    setShowLogin(true)
  }

  const skipAuth = () => {
    localStorage.setItem("mindsparq-auth-skipped", "true")
    setShowLogin(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        connections,
        signIn,
        signOut,
        showLogin,
        setShowLogin,
        skipAuth,
        userStatus,
        setUserStatus,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
