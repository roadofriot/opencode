import type { AuthProvider, AuthUser } from "./types"

async function desktopSignIn(provider: AuthProvider): Promise<AuthUser | null> {
  try {
    const api = (window as any).api
    await api.auth.signInWithProvider(provider)
    const user = await api.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email, name: user.name, avatar: user.avatar, provider }
  } catch {
    return null
  }
}

async function desktopSignOut(): Promise<void> {
  try {
    const api = (window as any).api
    await api.auth.signOut()
  } catch {}
}

export default { signIn: desktopSignIn, signOut: desktopSignOut }
