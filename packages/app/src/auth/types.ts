export type AuthProvider = "google" | "github"

export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  provider: AuthProvider
}

export type AuthState = {
  user: AuthUser | null
  supabaseToken: string | null
  gitHubToken: string | null
  isInitialized: boolean
}

export type AuthConnection = {
  name: string
  icon: string
  connected: boolean
  description: string
}

export type GitHubRepo = {
  id: number
  name: string
  fullName: string
  description: string | null
  private: boolean
  htmlUrl: string
  cloneUrl: string
  defaultBranch: string
}

export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}
