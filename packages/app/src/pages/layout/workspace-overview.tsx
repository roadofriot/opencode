import { createMemo, For, Show, createSignal } from "solid-js"
import { useParams } from "@solidjs/router"
import { useLayout } from "@/context/layout"
import { useRunService } from "@/context/run-service"
import { useTerminal } from "@/context/terminal"
import { useTabs } from "@/context/tabs"
import { displayName } from "@/pages/layout/helpers"
import { getProjectColors, colorKeyFromIconColor } from "@/utils/project-color"
import { decode64 } from "@/utils/base64"

export function WorkspaceOverview() {
  const layout = useLayout()
  const run = useRunService()
  const terminal = useTerminal()
  const tabs = useTabs()
  const params = useParams<{ dir?: string }>()

  const [collapsed, setCollapsed] = createSignal(false)

  const projects = createMemo(() => layout.projects.list())
  const openTerminals = createMemo(() => terminal.all())
  const openTabs = createMemo(() => tabs.store)
  // Derive active project from current route param
  const activeProjectWorktree = createMemo(() => {
    const dir = params.dir ? decode64(params.dir) : undefined
    if (!dir) return projects()[0]?.worktree
    const match = projects().find((p) => p.worktree === dir || p.sandboxes?.includes(dir))
    return match?.worktree ?? projects()[0]?.worktree
  })

  const isRunning = createMemo(() => run.state() === "running" || run.state() === "debugging")
  const activeProcess = createMemo(() => run.activeProcess())

  return (
    <div data-component="workspace-overview" class="shrink-0 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-v2-overlay-simple-overlay-hover transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed()}
      >
        <span data-component="overview-section-header" class="text-v2-text-text-muted">
          Workspace Overview
        </span>
        <span
          class="text-v2-text-text-muted transition-transform duration-200 flex items-center"
          classList={{ "rotate-180": !collapsed() }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>

      <Show when={!collapsed()}>
        <div class="flex flex-col gap-2 px-3 pb-3">

          {/* Open Projects */}
          <section>
            <p data-component="overview-section-header" class="text-v2-text-text-muted px-1 mb-1">
              Projects ({projects().length})
            </p>
            <div class="flex flex-col gap-0.5">
              <For each={projects()}>
                {(project) => {
                  const isActive = createMemo(() => activeProjectWorktree() === project.worktree)
                  const colors = createMemo(() => getProjectColors(colorKeyFromIconColor(project.icon?.color)))
                  return (
                    <div class="flex items-center gap-2 rounded-[5px] px-2 py-1 hover:bg-v2-overlay-simple-overlay-hover">
                      <span
                        class="project-status-dot size-1.5 shrink-0 rounded-full"
                        style={{ background: isActive() ? colors().accent : "var(--v2-border-border-weak)" }}
                        title={isActive() ? "Active" : "Open"}
                      />
                      <span class="min-w-0 flex-1 truncate text-[12px] font-medium text-v2-text-text-base">
                        {displayName(project)}
                      </span>
                      <Show when={isActive()}>
                        <span class="text-[9px] font-semibold tracking-wide text-v2-text-text-muted uppercase opacity-60">ACTIVE</span>
                      </Show>
                    </div>
                  )
                }}
              </For>
              <Show when={projects().length === 0}>
                <p class="text-[11px] text-v2-text-text-muted opacity-50 px-2">No open projects</p>
              </Show>
            </div>
          </section>

          {/* Running Process */}
          <Show when={isRunning() && activeProcess()}>
            {(proc) => (
              <section>
                <p data-component="overview-section-header" class="text-v2-text-text-muted px-1 mb-1">
                  Running
                </p>
                <div class="flex items-center gap-2 rounded-[5px] px-2 py-1 hover:bg-v2-overlay-simple-overlay-hover">
                  <span class="size-1.5 shrink-0 rounded-full bg-[#22c55e] animate-pulse" />
                  <span class="min-w-0 flex-1 truncate text-[12px] font-medium text-v2-text-text-base">
                    {proc().command.split(" ")[0]}
                  </span>
                  <span class="text-[9px] uppercase tracking-wide opacity-50 shrink-0 text-v2-text-text-muted">
                    {proc().state}
                  </span>
                </div>
              </section>
            )}
          </Show>

          {/* Open Terminals */}
          <Show when={openTerminals().length > 0}>
            <section>
              <p data-component="overview-section-header" class="text-v2-text-text-muted px-1 mb-1">
                Terminals ({openTerminals().length})
              </p>
              <div class="flex flex-col gap-0.5">
                <For each={openTerminals()}>
                  {(term) => (
                    <div class="flex items-center gap-2 rounded-[5px] px-2 py-1 hover:bg-v2-overlay-simple-overlay-hover">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" class="shrink-0 opacity-50">
                        <path d="M2 3.5L5.5 6L2 8.5M6.5 9H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                      </svg>
                      <span class="min-w-0 flex-1 truncate text-[12px] font-medium text-v2-text-text-base">
                        {term.title || `Terminal ${term.id.slice(0, 6)}`}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* AI Sessions (open tabs) */}
          <Show when={openTabs().length > 0}>
            <section>
              <p data-component="overview-section-header" class="text-v2-text-text-muted px-1 mb-1">
                Sessions ({openTabs().length})
              </p>
              <div class="flex flex-col gap-0.5">
                <For each={openTabs().slice(0, 4)}>
                  {(tab) => (
                    <div class="flex items-center gap-2 rounded-[5px] px-2 py-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" class="shrink-0 opacity-50">
                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2" />
                      </svg>
                      <span class="min-w-0 flex-1 truncate text-[12px] font-medium text-v2-text-text-base">
                        {tab.type === "draft" ? "New Session" : tab.type === "session" ? tab.sessionId.slice(0, 8) + "\u2026" : "Tab"}
                      </span>
                    </div>
                  )}
                </For>
                <Show when={openTabs().length > 4}>
                  <p class="text-[11px] text-v2-text-text-muted opacity-50 px-2">+{openTabs().length - 4} more</p>
                </Show>
              </div>
            </section>
          </Show>

        </div>
      </Show>
    </div>
  )
}
