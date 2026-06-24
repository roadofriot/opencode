import { createSignal, Show } from "solid-js"
import { Avatar } from "@opencode-ai/ui/avatar"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Card } from "@opencode-ai/ui/card"
import { useAuth } from "@/context/auth"
import { DialogCreateRepo } from "@/components/dialog-create-repo"
import { DialogProfile } from "@/components/auth/dialog-profile"
import { isGitHubConnected } from "@/auth/github-service"

export function UserMenu() {
  const auth = useAuth()
  const [open, setOpen] = createSignal(false)
  const [showCreateRepo, setShowCreateRepo] = createSignal(false)
  const [showProfile, setShowProfile] = createSignal(false)

  return (
    <Show when={auth.user()}>
      {(user) => (
        <>
          <div class="relative">
            <Tooltip
              placement="right"
              value={
                <div class="flex flex-col gap-0.5">
                  <span class="text-13-medium">{user().name ?? "User"}</span>
                  <Show when={user().email}>
                    <span class="text-12-regular text-text-weak">{user().email}</span>
                  </Show>
                  <span class="text-11-regular text-text-weak mt-0.5 capitalize">via {user().provider}</span>
                </div>
              }
            >
              <button
                onClick={() => setOpen(!open())}
                class="relative size-8 shrink-0 rounded-full cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-base"
                aria-label="User menu"
              >
                <Avatar
                  fallback={user().name ?? user().email ?? "U"}
                  src={user().avatar ?? undefined}
                  class="size-full rounded-full overflow-clip"
                />
                <span
                  class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background-base"
                  classList={{
                    "bg-green-500": auth.userStatus() === "active",
                    "bg-red-500": auth.userStatus() === "busy",
                    "bg-amber-500": auth.userStatus() === "away",
                  }}
                />
              </button>
            </Tooltip>

            <Show when={open()}>
              <>
                <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <Card
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[220px] shadow-lg"
                  style={{ "clip-path": "none" }}
                >
                  <div class="flex flex-col p-1">
                    <div class="px-3 py-2 border-b border-border-base">
                      <p class="text-13-medium text-text-base truncate">{user().name ?? "User"}</p>
                      <p class="text-11-regular text-text-weak truncate">{user().email}</p>
                    </div>

                    <div class="flex flex-col gap-0.5 mt-1">
                      <button
                        onClick={() => {
                          setOpen(false)
                          setShowProfile(true)
                        }}
                        class="w-full text-left px-3 py-2 text-13-regular text-text-base hover:bg-background-hover rounded-md transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg class="w-4 h-4 text-text-weak" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Profile
                      </button>

                      <Show when={isGitHubConnected()}>
                        <button
                          onClick={() => {
                            setOpen(false)
                            setShowCreateRepo(true)
                          }}
                          class="w-full text-left px-3 py-2 text-13-regular text-text-base hover:bg-background-hover rounded-md transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <svg class="w-4 h-4 text-text-weak" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Create Repository
                        </button>
                      </Show>

                      <button
                        onClick={() => {
                          setOpen(false)
                          void auth.signOut()
                        }}
                        class="w-full text-left px-3 py-2 text-13-regular text-text-base hover:bg-background-hover rounded-md transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg class="w-4 h-4 text-text-weak" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            </Show>
          </div>

          <DialogCreateRepo
            open={showCreateRepo()}
            onClose={() => setShowCreateRepo(false)}
            onCreated={(repo) => {
              console.log("Repository created:", repo)
            }}
          />

          <DialogProfile
            open={showProfile()}
            onClose={() => setShowProfile(false)}
          />
        </>
      )}
    </Show>
  )
}
