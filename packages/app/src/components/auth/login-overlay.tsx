import { createSignal, Show, onMount } from "solid-js"
import { Button } from "@mindsparq-ai/ui/button"
import { Card } from "@mindsparq-ai/ui/card"
import { Mark } from "@mindsparq-ai/ui/logo"
import { useAuth } from "@/context/auth"
import type { AuthProvider } from "@/auth/types"
import { isSupabaseConfigured } from "@/auth/supabase-service"
import { showToast } from "@mindsparq-ai/ui/toast"

export function LoginOverlay() {
  const auth = useAuth()
  const [loading, setLoading] = createSignal<AuthProvider | null>(null)
  const [, setError] = createSignal<string | null>(null)
  const [isVisible, setIsVisible] = createSignal(false)

  onMount(() => {
    requestAnimationFrame(() => setIsVisible(true))
  })

  const handleSignIn = async (provider: AuthProvider) => {
    setLoading(provider)
    setError(null)
    try {
      await auth.signIn(provider)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed"
      setError(msg)
      showToast({
        title: "Authentication failed",
        description: msg,
        variant: "error",
      })
    } finally {
      setLoading(null)
    }
  }

  const configured = isSupabaseConfigured() || ("api" in window && (window as any).api?.auth)

  return (
    <div
      data-component="login-overlay"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-background-base overflow-hidden"
    >
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)"
        }}
      />

      <div
        class="flex flex-col items-center gap-6 max-w-sm w-full px-4 sm:px-6"
        style={{
          opacity: isVisible() ? 1 : 0,
          transform: isVisible() ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out"
        }}
      >
        <div
          style={{
            opacity: isVisible() ? 1 : 0,
            transform: isVisible() ? "scale(1)" : "scale(0.85)",
            transition: "opacity 600ms ease-out 100ms, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms"
          }}
        >
          <Mark class="w-20 h-20" />
        </div>

        <div
          class="flex flex-col items-center gap-1.5 text-center"
          style={{
            opacity: isVisible() ? 1 : 0,
            transform: isVisible() ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 400ms ease-out 300ms, transform 400ms ease-out 300ms"
          }}
        >
          <h1 class="text-20-semibold text-text-base">MindSparq AI</h1>
          <Show
            when={configured}
            fallback={
              <div class="flex flex-col items-center gap-3">
                <p class="text-13-regular text-text-weak max-w-[260px]">
                  Sign in to sync data across devices.
                </p>
                <Card variant="info" class="max-w-[300px]">
                  <p class="text-12-medium text-text-base mb-1">To enable auth, create a .env file with:</p>
                  <code class="text-11-regular text-text-weak block leading-relaxed">
                    VITE_SUPABASE_URL=https://your-project.supabase.co<br />
                    VITE_SUPABASE_ANON_KEY=your-anon-key
                  </code>
                  <p class="text-11-regular text-text-weak mt-1.5">
                    Then enable Google/GitHub auth in your Supabase dashboard.
                  </p>
                </Card>
              </div>
            }
          >
            <p class="text-13-regular text-text-weak max-w-[260px]">
              Sign in to sync your data across devices.
            </p>
          </Show>
        </div>

        <Show when={configured}>
          <Card
            class="w-full max-w-[340px]"
            style={{
              opacity: isVisible() ? 1 : 0,
              transform: isVisible() ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 400ms ease-out 500ms, transform 400ms ease-out 500ms"
            }}
          >
            <div class="flex flex-col gap-2.5 p-1">
              <Button
                variant="secondary"
                onClick={() => handleSignIn("google")}
                disabled={loading() !== null}
                class="w-full justify-center gap-2.5 h-10 text-14-medium rounded-lg hover:bg-surface-raised-base-hover transition-all duration-200 cursor-pointer"
              >
                <Show when={loading() !== "google"} fallback={<LoadingSpinner />}>
                  <GoogleIcon />
                  Sign in with Google
                </Show>
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleSignIn("github")}
                disabled={loading() !== null}
                class="w-full justify-center gap-2.5 h-10 text-14-medium rounded-lg hover:bg-surface-raised-base-hover transition-all duration-200 cursor-pointer"
              >
                <Show when={loading() !== "github"} fallback={<LoadingSpinner />}>
                  <GitHubIcon />
                  Sign in with GitHub
                </Show>
              </Button>
            </div>
          </Card>
        </Show>

        <div
          class="flex flex-col items-center gap-1.5"
          style={{
            opacity: isVisible() ? 1 : 0,
            transition: "opacity 400ms ease-out 700ms"
          }}
        >
          <div class="flex gap-3">
            <ServiceIndicator name="Supabase" active={false} />
            <ServiceIndicator name="Firebase" active={false} />
            <ServiceIndicator name="GitHub" active={false} />
          </div>
        </div>

        <button
          onClick={auth.skipAuth}
          class="text-13-regular text-text-weak hover:text-text-base transition-colors cursor-pointer"
          style={{
            opacity: isVisible() ? 1 : 0,
            transition: "opacity 400ms ease-out 800ms"
          }}
        >
          Continue without signing in
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function ServiceIndicator(props: { name: string; active: boolean }) {
  return (
    <div class="flex items-center gap-1">
      <div
        class="w-1.5 h-1.5 rounded-full"
        classList={{
          "bg-green-500": props.active,
          "bg-text-weak opacity-30": !props.active,
        }}
      />
      <span class="text-11-regular text-text-weak">{props.name}</span>
    </div>
  )
}
