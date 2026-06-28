import { createSignal, For, Show, createMemo } from "solid-js"
import { Icon } from "@mindsparq-ai/ui/icon"
import { IconButton } from "@mindsparq-ai/ui/icon-button"

export type ProblemSeverity = "error" | "warning" | "info"

export interface Problem {
  id: string
  severity: ProblemSeverity
  message: string
  file?: string
  line?: number
  column?: number
  source?: string
  timestamp: number
}

const SEVERITY_COLORS: Record<ProblemSeverity, string> = {
  error: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
}

const SEVERITY_ICONS: Record<ProblemSeverity, "close-small" | "close-small" | "close-small"> = {
  error: "close-small",
  warning: "close-small",
  info: "close-small",
}

export function ProblemsPanel() {
  const [problems, setProblems] = createSignal<Problem[]>([])
  const [filter, setFilter] = createSignal<ProblemSeverity | "all">("all")
  const [search, setSearch] = createSignal("")

  const filteredProblems = createMemo(() => {
    let result = problems()
    if (filter() !== "all") {
      result = result.filter((p) => p.severity === filter())
    }
    const query = search().toLowerCase()
    if (query) {
      result = result.filter(
        (p) =>
          p.message.toLowerCase().includes(query) ||
          p.file?.toLowerCase().includes(query) ||
          p.source?.toLowerCase().includes(query),
      )
    }
    return result
  })

  const counts = createMemo(() => {
    const all = problems()
    return {
      error: all.filter((p) => p.severity === "error").length,
      warning: all.filter((p) => p.severity === "warning").length,
      info: all.filter((p) => p.severity === "info").length,
    }
  })

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weaker-base bg-background-stronger">
        <div class="flex items-center gap-1">
          <button
            onClick={() => setFilter("all")}
            class="px-1.5 py-0.5 rounded text-11-medium cursor-pointer transition-colors"
            classList={{
              "bg-surface-base text-text-base": filter() === "all",
              "text-text-weak hover:text-text-base": filter() !== "all",
            }}
          >
            All ({problems().length})
          </button>
          <button
            onClick={() => setFilter("error")}
            class="px-1.5 py-0.5 rounded text-11-medium cursor-pointer transition-colors"
            classList={{
              "bg-surface-base text-text-base": filter() === "error",
              "text-text-weak hover:text-text-base": filter() !== "error",
            }}
          >
            <span class="text-red-500">Errors</span> ({counts().error})
          </button>
          <button
            onClick={() => setFilter("warning")}
            class="px-1.5 py-0.5 rounded text-11-medium cursor-pointer transition-colors"
            classList={{
              "bg-surface-base text-text-base": filter() === "warning",
              "text-text-weak hover:text-text-base": filter() !== "warning",
            }}
          >
            <span class="text-yellow-500">Warnings</span> ({counts().warning})
          </button>
          <button
            onClick={() => setFilter("info")}
            class="px-1.5 py-0.5 rounded text-11-medium cursor-pointer transition-colors"
            classList={{
              "bg-surface-base text-text-base": filter() === "info",
              "text-text-weak hover:text-text-base": filter() !== "info",
            }}
          >
            <span class="text-blue-500">Info</span> ({counts().info})
          </button>
        </div>
        <div class="flex-1" />
        <input
          type="text"
          placeholder="Filter problems..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-2 py-0.5 text-11-regular bg-surface-base border border-border-weaker-base rounded-md text-text-base placeholder:text-text-weaker w-40 focus:outline-none focus:border-accent-base"
        />
        <IconButton
          icon="close"
          variant="ghost"
          iconSize="small"
          onClick={() => setProblems([])}
          aria-label="Clear problems"
        />
      </div>
      <div class="flex-1 overflow-auto">
        <Show
          when={filteredProblems().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-12-regular gap-1">
              <Icon name="bug" size="normal" class="text-text-weaker" />
              <span>No problems detected</span>
            </div>
          }
        >
          <For each={filteredProblems()}>
            {(problem) => (
              <div class="flex items-start gap-2 px-3 py-1.5 border-b border-border-weaker-base hover:bg-background-hover cursor-pointer text-12-regular">
                <Icon name={SEVERITY_ICONS[problem.severity] as any} size="small" class={`mt-0.5 ${SEVERITY_COLORS[problem.severity]}`} />
                <div class="flex-1 min-w-0">
                  <span class="text-text-base">{problem.message}</span>
                  <Show when={problem.file}>
                    <span class="text-text-weak ml-2">
                      {problem.file}
                      <Show when={problem.line}>
                        <span class="text-text-weaker">:{problem.line}</span>
                      </Show>
                    </span>
                  </Show>
                </div>
                <Show when={problem.source}>
                  <span class="text-10-regular text-text-weaker shrink-0">{problem.source}</span>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
