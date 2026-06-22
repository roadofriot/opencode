import { createSignal, createContext, useContext, onCleanup, type ParentProps, type Accessor, onMount } from "solid-js"
import type { AuthProvider, AuthUser, AuthState, AuthConnection } from "../auth/types"
import { initializeAuth, signIn as unifiedSignIn, signOut as unifiedSignOut, subscribeToAuth } from "../auth/unified-auth"
import { isGitHubConnected } from "../auth/github-service"
import { isFirebaseAvailable } from "../auth/firebase-service"

type AuthContextValue = {
  state: Accessor<AuthState>
  user: Accessor<AuthUser | null>
  isAuthenticated: Accessor<boolean>
  isLoading: Accessor<boolean>
  connections: Accessor<AuthConnection[]>
  signIn: (provider: AuthProvider) => Promise<void>
  signOut: () => Promise<void>
  showLogin: Accessor<boolean>
  setShowLogin: (show: boolean) => void
  skipAuth: () => void
}

const AuthContext = createContext<AuthContextValue>()

export function AuthProvider(props: ParentProps) {
  const [state, setState] = createSignal<AuthState>({ user: null, supabaseToken: null, gitHubToken: null, isInitialized: false })
  const [showLogin, setShowLogin] = createSignal(false)

  const user = () => state().user
  const isAuthenticated = () => state().user !== null
  const isLoading = () => !state().isInitialized

  const connections = (): AuthConnection[] => [
    { name: "Google", icon: "google", connected: user()?.provider === "google", description: "Primary sign-in" },
    { name: "GitHub", icon: "github", connected: isGitHubConnected(), description: "Code repositories" },
    { name: "Supabase", icon: "database", connected: state().supabaseToken !== null, description: "Data sync" },
    { name: "Firebase", icon: "zap", connected: isFirebaseAvailable(), description: "Realtime updates" },
  ]

  onMount(() => {
    void initializeAuth().then((newState) => {
      setState(newState)
      if (newState.isInitialized) {
        const hasSkipped = typeof localStorage !== "undefined" && localStorage.getItem("opencode-auth-skipped")
        if (!newState.user && !hasSkipped) {
          setShowLogin(true)
        }
      }
    })
  })

  const unsub = subscribeToAuth((newState) => {
    setState(newState)
  })
  onCleanup(unsub)

  const signIn = async (provider: AuthProvider) => {
    await unifiedSignIn(provider)
    setShowLogin(false)
  }

  const signOut = async () => {
    await unifiedSignOut()
  }

  const skipAuth = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("opencode-auth-skipped", "true")
    }
    setShowLogin(false)
  }

  return (
    <AuthContext.Provider
      value={{ state, user, isAuthenticated, isLoading, connections, signIn, signOut, showLogin, setShowLogin, skipAuth }}
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
