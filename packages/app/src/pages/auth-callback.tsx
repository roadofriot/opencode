import { useNavigate, useSearchParams } from "@solidjs/router"
import { createEffect, onMount } from "solid-js"
import { getClient } from "@mindsparq-ai/supabase/client"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  onMount(async () => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))

    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (accessToken && refreshToken) {
      try {
        const client = getClient()
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } catch (e) {
        console.error("Failed to set session:", e)
      }
    }

    window.history.replaceState(null, "", window.location.pathname)
    navigate("/", { replace: true })
  })

  return (
    <div class="h-dvh w-screen flex items-center justify-center bg-background-base">
      <p class="text-14-regular text-text-base">Signing you in...</p>
    </div>
  )
}
