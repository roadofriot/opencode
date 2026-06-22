import { BrowserWindow } from "electron"
import { randomBytes, randomUUID } from "node:crypto"
import { createServer, type AddressInfo } from "node:net"
import http from "node:http"

type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  providerToken?: string
}

type AuthStateChangeCallback = (user: AuthUser | null) => void

const callbacks = new Set<AuthStateChangeCallback>()
let currentUser: AuthUser | null = null

function notify(user: AuthUser | null) {
  currentUser = user
  for (const cb of callbacks) cb(user)
}

function requireEnv(name: string): string {
  const value = process.env[name] || process.env[name.toLowerCase()]
  if (!value) throw new Error(`Missing required env var: ${name}. Set it in .env or the desktop environment.`)
  return value
}

function base64Url(buf: Uint8Array): string {
  return btoa(String.fromCodePoint(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function generateCodeVerifier(): string {
  return base64Url(new Uint8Array(randomBytes(32)))
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(verifier))
  return base64Url(new Uint8Array(hash))
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on("error", reject)
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as AddressInfo).port
      srv.close(() => resolve(port))
    })
  })
}

export async function signInWithProvider(provider: "github" | "google"): Promise<void> {
  const supabaseUrl = requireEnv("VITE_SUPABASE_URL")
  const anonKey = requireEnv("VITE_SUPABASE_ANON_KEY")

  const port = await getAvailablePort()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const codeChallengeMethod = "s256"
  const redirectTo = `http://127.0.0.1:${port}/auth/callback`

  const authUrl = `${supabaseUrl}/auth/v1/authorize?` +
    `provider=${provider}` +
    `&redirect_to=${encodeURIComponent(redirectTo)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=${codeChallengeMethod}` +
    `&response_type=code`

  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: `Sign in with ${provider === "github" ? "GitHub" : "Google"}`,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  return new Promise<void>((resolve, reject) => {
    let handled = false
    let server: http.Server | null = null

    server = http.createServer(async (req, res) => {
      if (handled) return

      const parsedUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`)
      const code = parsedUrl.searchParams.get("code")

      if (!code) {
        res.writeHead(400).end("Missing code")
        return
      }

      handled = true

      try {
        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
          },
          body: JSON.stringify({
            auth_code: code,
            code_verifier: codeVerifier,
          }),
        })

        if (!tokenRes.ok) {
          const errText = await tokenRes.text()
          res.writeHead(400).end(`Token exchange failed: ${errText}`)
          reject(new Error(`Token exchange failed: ${tokenRes.status} ${errText}`))
          return
        }

        const tokenData = await tokenRes.json()

        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            apikey: anonKey,
          },
        })

        if (!userRes.ok) {
          res.writeHead(400).end("Failed to fetch user")
          reject(new Error("Failed to fetch user"))
          return
        }

        const userData = await userRes.json()

        notify({
          id: userData.id,
          email: userData.email ?? null,
          name: userData.user_metadata?.full_name ?? userData.user_metadata?.name ?? userData.email ?? "User",
          avatar: userData.user_metadata?.avatar_url ?? userData.user_metadata?.picture ?? null,
          providerToken: tokenData.access_token,
        })

        res.writeHead(200, { "Content-Type": "text/html" }).end(`<!DOCTYPE html>
<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
<p>Signed in! You can close this window.</p>
<script>window.close()</script>
</body></html>`)

        authWindow.close()
        resolve()
      } catch (e) {
        res.writeHead(500).end("Auth failed")
        reject(e)
      } finally {
        server?.close()
      }
    })

    server.listen(port, "127.0.0.1")

    authWindow.loadURL(authUrl)

    authWindow.on("closed", () => {
      if (!handled) {
        server?.close()
        reject(new Error("Sign in cancelled"))
      }
    })

    authWindow.webContents.on("will-redirect", (_event, url) => {
      if (url.startsWith(`http://127.0.0.1:${port}`)) {
        _event.preventDefault()
        fetch(url).catch(() => {})
      }
    })
  })
}

export function signOut(): void {
  notify(null)
}

export function getUser(): AuthUser | null {
  return currentUser
}

export function onAuthStateChanged(cb: AuthStateChangeCallback): () => void {
  callbacks.add(cb)
  if (currentUser) cb(currentUser)
  return () => callbacks.delete(cb)
}

export * as Auth from "."
