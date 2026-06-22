import type { FirebaseConfig } from "./types"

let initialized = false
let firebaseApp: any = null

function getConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (!apiKey || !authDomain || !projectId) return null
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  }
}

export async function initFirebase(): Promise<boolean> {
  if (initialized) return true
  const config = getConfig()
  if (!config) return false

  try {
    const { initializeApp } = await import("firebase/app")
    const { getAuth, signInWithCustomToken } = await import("firebase/auth")
    firebaseApp = initializeApp(config)
    initialized = true
    return true
  } catch {
    return false
  }
}

export async function signInToFirebase(supabaseToken: string): Promise<boolean> {
  if (!initialized) {
    const ok = await initFirebase()
    if (!ok) return false
  }

  try {
    const { getAuth, signInWithCustomToken } = await import("firebase/auth")
    const auth = getAuth(firebaseApp)
    await signInWithCustomToken(auth, supabaseToken)
    return true
  } catch {
    return false
  }
}

export async function signOutFirebase(): Promise<void> {
  if (!initialized || !firebaseApp) return
  try {
    const { getAuth, signOut } = await import("firebase/auth")
    await signOut(getAuth(firebaseApp))
  } catch {}
}

export function isFirebaseAvailable(): boolean {
  return initialized
}

export async function getFirebaseAuth(): Promise<any | null> {
  if (!initialized || !firebaseApp) return null
  const { getAuth } = await import("firebase/auth")
  return getAuth(firebaseApp)
}

export async function getFirestore(): Promise<any | null> {
  if (!initialized || !firebaseApp) return null
  const { getFirestore } = await import("firebase/firestore")
  return getFirestore(firebaseApp)
}
