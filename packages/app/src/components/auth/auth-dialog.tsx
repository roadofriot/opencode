import { createSignal, Show } from "solid-js"
import { Button } from "@mindsparq-ai/ui/button"
import { Card } from "@mindsparq-ai/ui/card"

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
      <div class="flex flex-col gap-1">
        <h2 class="text-16-semibold text-text-base">Sign in to MindSparq AI</h2>
        <p class="text-12-regular text-text-weak">Connect your account to sync data across devices.</p>
      </div>
      <Card class="mt-1">
        <div class="flex flex-col gap-2.5 p-1">
          <Button
            variant="secondary"
            onClick={handleGitHub}
            disabled={loading() !== null}
            class="w-full justify-center gap-2 h-10 text-14-medium rounded-lg cursor-pointer"
          >
            <Show when={loading() !== "github"} fallback="Connecting...">
              Sign in with GitHub
            </Show>
          </Button>
          <Button
            variant="secondary"
            onClick={handleGoogle}
            disabled={loading() !== null}
            class="w-full justify-center gap-2 h-10 text-14-medium rounded-lg cursor-pointer"
          >
            <Show when={loading() !== "google"} fallback="Connecting...">
              Sign in with Google
            </Show>
          </Button>
        </div>
      </Card>
      <Button variant="ghost" onClick={props.onClose} class="mt-1">
        Skip for now
      </Button>
    </div>
  )
}
