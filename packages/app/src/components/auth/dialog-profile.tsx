import { createSignal, Show, createEffect, createMemo, For } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { useAuth } from "@/context/auth"
import { Avatar } from "@opencode-ai/ui/avatar"
import { useGlobal } from "@/context/global"
import { useServer, ServerConnection } from "@/context/server"
import { getFilename } from "@opencode-ai/core/util/path"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"

type DialogProfileProps = {
  open: boolean
  onClose: () => void
}

export function DialogProfile(props: DialogProfileProps) {
  const auth = useAuth()
  const global = useGlobal()
  const server = useServer()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = createSignal<"profile" | "history">("profile")
  const [totalUsageTime, setTotalUsageTime] = createSignal(0)

  // Fetch usage time from localStorage on mount and open
  createEffect(() => {
    if (props.open) {
      const stored = parseInt(localStorage.getItem("mindsparq_total_usage_seconds") ?? "0", 10)
      setTotalUsageTime(stored)
    }
  })

  const conn = () => global.servers.list().find((c) => ServerConnection.key(c) === server.key) ?? global.servers.list()[0]
  const focusedCtx = () => conn() ? global.createServerCtx(conn()) : undefined
  const projects = () => focusedCtx()?.projects.list() ?? []

  const totalSessions = createMemo(() => {
    let count = 0
    const focusedSync = focusedCtx()?.sync
    if (focusedSync) {
      for (const p of projects()) {
        const [store] = focusedSync.child(p.worktree, { bootstrap: false })
        count += store?.session?.length ?? 0
      }
    }
    return count
  })

  const allSessions = createMemo(() => {
    const focusedSync = focusedCtx()?.sync
    if (!focusedSync) return []
    return projects()
      .flatMap((project) => {
        const [store] = focusedSync.child(project.worktree, { bootstrap: false })
        const sessions = store?.session ?? []
        return sessions.map((s) => ({
          session: s,
          project,
          projectName: project.name || getFilename(project.worktree),
        }))
      })
      .sort((a, b) => (b.session.time.updated ?? b.session.time.created) - (a.session.time.updated ?? a.session.time.created))
      .slice(0, 5) // Show top 5 recent sessions
  })

  const handleClose = () => {
    props.onClose()
  }

  const formatUsageTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`
  }

  const user = () => auth.user()

  const handleSessionClick = (sessionDir: string, sessionId: string) => {
    const focusedConn = conn()
    if (focusedConn && focusedCtx()) {
      focusedCtx()!.projects.open(sessionDir)
      focusedCtx()!.projects.touch(sessionDir)
    }
    navigate(`/${base64Encode(sessionDir)}/session/${sessionId}`)
    handleClose()
  }

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-[10000] flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div
          class="relative bg-background-base border border-border-base rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85dvh]"
          style={{
            animation: "dialog-slide-in 200ms ease-out"
          }}
        >
          {/* Header */}
          <div class="p-6 pb-4 border-b border-border-base flex items-center justify-between shrink-0">
            <h2 class="text-18-semibold text-text-base">User Profile Dashboard</h2>
            <button
              onClick={handleClose}
              class="p-1 rounded-md hover:bg-surface-raised-base-hover transition-colors text-text-weak hover:text-text-base cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs Navigation */}
          <div class="px-6 pt-3 flex gap-2 shrink-0 border-b border-border-base/50">
            <button
              onClick={() => setActiveTab("profile")}
              class="pb-2 text-13-medium transition-all relative cursor-pointer"
              classList={{
                "text-text-base font-semibold": activeTab() === "profile",
                "text-text-weak hover:text-text-base": activeTab() !== "profile"
              }}
            >
              Profile & Status
              {activeTab() === "profile" && <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-base" />}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              class="pb-2 text-13-medium transition-all relative cursor-pointer ml-4"
              classList={{
                "text-text-base font-semibold": activeTab() === "history",
                "text-text-weak hover:text-text-base": activeTab() !== "history"
              }}
            >
              History & Stats
              {activeTab() === "history" && <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-base" />}
            </button>
          </div>

          {/* Tabs Content */}
          <div class="flex-1 overflow-y-auto p-6 min-h-0">
            <Show when={activeTab() === "profile"}>
              {/* Profile Card */}
              <div class="flex flex-col items-center gap-3 mb-6">
                <div class="relative">
                  <Avatar
                    fallback={user()?.name ?? user()?.email ?? "U"}
                    src={user()?.avatar ?? undefined}
                    class="w-20 h-20 rounded-full"
                  />
                  <span
                    class="absolute bottom-0 right-0 block h-4 w-4 rounded-full ring-2 ring-background-base"
                    classList={{
                      "bg-green-500": auth.userStatus() === "active",
                      "bg-red-500": auth.userStatus() === "busy",
                      "bg-amber-500": auth.userStatus() === "away",
                    }}
                  />
                </div>
                <Show when={user()} fallback={<div class="text-text-weak text-13-regular">Not signed in</div>}>
                  <div class="text-center">
                    <p class="text-16-semibold text-text-base">{user()!.name ?? "User"}</p>
                    <p class="text-13-regular text-text-weak">{user()!.email}</p>
                  </div>
                </Show>
              </div>

              {/* Status Selector */}
              <div class="flex flex-col gap-2 mb-6">
                <label class="text-12-medium text-text-weak">Set Your Status</label>
                <div class="flex gap-2">
                  <button
                    onClick={() => auth.setUserStatus("active")}
                    class="flex-1 py-1.5 px-3 rounded-lg text-13-medium border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
                    classList={{
                      "bg-green-500/10 border-green-500 text-green-500": auth.userStatus() === "active",
                      "border-border-base bg-transparent hover:bg-background-hover text-text-base": auth.userStatus() !== "active"
                    }}
                  >
                    <span class="w-2 h-2 rounded-full bg-green-500" />
                    Active
                  </button>
                  <button
                    onClick={() => auth.setUserStatus("busy")}
                    class="flex-1 py-1.5 px-3 rounded-lg text-13-medium border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
                    classList={{
                      "bg-red-500/10 border-red-500 text-red-500": auth.userStatus() === "busy",
                      "border-border-base bg-transparent hover:bg-background-hover text-text-base": auth.userStatus() !== "busy"
                    }}
                  >
                    <span class="w-2 h-2 rounded-full bg-red-500" />
                    Busy
                  </button>
                  <button
                    onClick={() => auth.setUserStatus("away")}
                    class="flex-1 py-1.5 px-3 rounded-lg text-13-medium border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
                    classList={{
                      "bg-amber-500/10 border-amber-500 text-amber-500": auth.userStatus() === "away",
                      "border-border-base bg-transparent hover:bg-background-hover text-text-base": auth.userStatus() !== "away"
                    }}
                  >
                    <span class="w-2 h-2 rounded-full bg-amber-500" />
                    Away
                  </button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="p-3 rounded-lg bg-surface-raised-base flex flex-col gap-0.5 border border-border-base/50">
                  <span class="text-11-medium text-text-weak uppercase">Active Usage</span>
                  <span class="text-15-semibold text-text-base">{formatUsageTime(totalUsageTime())}</span>
                </div>
                <div class="p-3 rounded-lg bg-surface-raised-base flex flex-col gap-0.5 border border-border-base/50">
                  <span class="text-11-medium text-text-weak uppercase">Account Type</span>
                  <span class="text-15-semibold text-text-base capitalize">{user()?.provider ?? "Local"}</span>
                </div>
              </div>
            </Show>

            <Show when={activeTab() === "history"}>
              {/* Analytics Summary */}
              <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="p-3 rounded-lg bg-surface-raised-base border border-border-base/50 flex flex-col items-center">
                  <span class="text-24-semibold text-accent-base">{projects().length}</span>
                  <span class="text-12-medium text-text-weak uppercase mt-0.5">Projects</span>
                </div>
                <div class="p-3 rounded-lg bg-surface-raised-base border border-border-base/50 flex flex-col items-center">
                  <span class="text-24-semibold text-accent-base">{totalSessions()}</span>
                  <span class="text-12-medium text-text-weak uppercase mt-0.5">Total Sessions</span>
                </div>
              </div>

              {/* Projects List */}
              <div class="flex flex-col gap-2 mb-6">
                <h3 class="text-12-semibold text-text-weak uppercase tracking-wider">Your Projects</h3>
                <Show
                  when={projects().length > 0}
                  fallback={<div class="text-13-regular text-text-weak italic p-2 bg-surface-raised-base rounded-md">No projects found.</div>}
                >
                  <div class="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    <For each={projects()}>
                      {(p) => (
                        <div class="flex items-center justify-between p-2 rounded-lg bg-surface-raised-base border border-border-base/30 text-13-medium text-text-base">
                          <span class="truncate pr-4">{p.name || getFilename(p.worktree)}</span>
                          <span class="text-11-regular text-text-weak shrink-0 truncate max-w-[160px]">{getFilename(p.worktree)}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Recent Sessions */}
              <div class="flex flex-col gap-2">
                <h3 class="text-12-semibold text-text-weak uppercase tracking-wider">Recent Sessions</h3>
                <Show
                  when={allSessions().length > 0}
                  fallback={<div class="text-13-regular text-text-weak italic p-2 bg-surface-raised-base rounded-md">No recent sessions.</div>}
                >
                  <div class="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    <For each={allSessions()}>
                      {({ session, project }) => (
                        <button
                          onClick={() => handleSessionClick(session.directory, session.id)}
                          class="w-full text-left p-2 rounded-lg bg-surface-raised-base hover:bg-surface-raised-base-hover border border-border-base/30 hover:border-accent-base/50 transition-all duration-200 cursor-pointer flex items-center justify-between text-13-medium text-text-base gap-2"
                        >
                          <span class="truncate font-semibold">{session.title || "Untitled Session"}</span>
                          <span class="text-11-regular text-text-weak shrink-0 uppercase bg-background-base px-1.5 py-0.5 rounded border border-border-base/50">{project.name || getFilename(session.directory)}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Footer Controls */}
          <div class="p-6 border-t border-border-base flex gap-3 shrink-0 bg-surface-raised-base">
            <Button
              variant="secondary"
              onClick={handleClose}
              class="flex-1 justify-center h-10 rounded-lg text-14-medium cursor-pointer"
            >
              Close
            </Button>
            <Show when={user()}>
              <Button
                variant="primary"
                onClick={() => {
                  void auth.signOut()
                  handleClose()
                }}
                class="flex-1 justify-center h-10 rounded-lg text-14-medium cursor-pointer bg-red-600 hover:bg-red-700 text-[#FFF]"
              >
                Sign Out
              </Button>
            </Show>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dialog-slide-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </Show>
  )
}
