import { createSignal, Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"

type AuthDialogProps = {
  onClose: () => void
  onGitHubLogin: () => void
  onGoogleLogin: () => void
}

export function AuthDialog(props: AuthDialogProps) {
  const [loading, setLoading] = createSignal<string | null>(null)

  const handleGitHub = async () => {
    setLoading("github")
    try {
      await props.onGitHubLogin()
    } finally {
      setLoading(null)
    }
  }

  const handleGoogle = async () => {
    setLoading("google")
    try {
      await props.onGoogleLogin()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div data-component="auth-dialog" class="flex flex-col gap-4 p-6">
      <h2 class="text-16-semibold">Sign in to MindSparQ AI</h2>
      <p class="text-12-regular text-text-weak">Connect your account to sync data across devices.</p>
      <div class="flex flex-col gap-3 mt-2">
        <Button
          variant="secondary"
          onClick={handleGitHub}
          disabled={loading() !== null}
        >
          <Show when={loading() !== "github"} fallback="Connecting...">
            Sign in with GitHub
          </Show>
        </Button>
        <Button
          variant="secondary"
          onClick={handleGoogle}
          disabled={loading() !== null}
        >
          <Show when={loading() !== "google"} fallback="Connecting...">
            Sign in with Google
          </Show>
        </Button>
      </div>
      <Button variant="ghost" onClick={props.onClose} class="mt-2">
        Skip for now
      </Button>
    </div>
  )
}
