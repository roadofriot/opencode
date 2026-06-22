import { createSignal, Show } from "solid-js"
import { Avatar } from "@opencode-ai/ui/avatar"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useAuth } from "@/context/auth"

export function UserMenu() {
  const auth = useAuth()
  const [open, setOpen] = createSignal(false)

  return (
    <Show when={auth.user()}>
      {(user) => (
        <div class="relative">
          <Tooltip placement="right" value={
            <div class="flex flex-col gap-0.5">
              <span class="text-13-medium">{user().name ?? "User"}</span>
              <Show when={user().email}>
                <span class="text-12-regular text-text-weak">{user().email}</span>
              </Show>
              <span class="text-11-regular text-text-weak mt-0.5 capitalize">via {user().provider}</span>
            </div>
          }>
            <button
              onClick={() => setOpen(!open())}
              class="size-8 shrink-0 rounded-full overflow-clip cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-base"
              aria-label="User menu"
            >
              <Avatar
                fallback={user().name ?? user().email ?? "U"}
                src={user().avatar ?? undefined}
                class="size-full rounded-full"
              />
            </button>
          </Tooltip>

          <Show when={open()}>
            <>
              <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[180px] rounded-lg bg-background-base shadow-lg border border-border-base p-1">
                <div class="px-3 py-2 border-b border-border-base">
                  <p class="text-13-medium text-text-base truncate">{user().name ?? "User"}</p>
                  <p class="text-11-regular text-text-weak truncate">{user().email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); void auth.signOut() }}
                  class="w-full text-left px-3 py-2 text-13-regular text-text-base hover:bg-background-hover rounded transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </>
          </Show>
        </div>
      )}
    </Show>
  )
}
