import { createSignal, For, Show, createMemo, onCleanup, onMount } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

export type LogLevel = "info" | "debug" | "warning" | "error" | "trace"

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  channel: string
  timestamp: number
}

export type OutputChannel = "all" | "application" | "build" | "extension" | "agent" | "git" | "system" | "lsp"

const CHANNELS: { id: OutputChannel; label: string }[] = [
  { id: "all", label: "All" },
  { id: "application", label: "Application" },
  { id: "build", label: "Build" },
  { id: "extension", label: "Extension" },
  { id: "agent", label: "AI Agent" },
  { id: "git", label: "Git" },
  { id: "system", label: "System" },
  { id: "lsp", label: "LSP" },
]

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: "text-text-base",
  debug: "text-text-weak",
  warning: "text-yellow-500",
  error: "text-red-500",
  trace: "text-text-weaker",
}

const LOG_LEVEL_LABEL: Record<LogLevel, string> = {
  info: "INFO",
  debug: "DEBUG",
  warning: "WARN",
  error: "ERROR",
  trace: "TRACE",
}

export function OutputPanel() {
  const [entries, setEntries] = createSignal<LogEntry[]>([])
  const [channel, setChannel] = createSignal<OutputChannel>("all")
  const [search, setSearch] = createSignal("")
  const [autoScroll, setAutoScroll] = createSignal(true)
  const [levelFilter, setLevelFilter] = createSignal<LogLevel | "all">("all")
  let scrollRef: HTMLDivElement | undefined

  const filteredEntries = createMemo(() => {
    let result = entries()
    if (channel() !== "all") {
      result = result.filter((e) => e.channel === channel())
    }
    if (levelFilter() !== "all") {
      result = result.filter((e) => e.level === levelFilter())
    }
    const query = search().toLowerCase()
    if (query) {
      result = result.filter((e) => e.message.toLowerCase().includes(query))
    }
    return result
  })

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const scrollToBottom = () => {
    if (scrollRef && autoScroll()) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  }

  const addEntry = (entry: Omit<LogEntry, "id">) => {
    setEntries((prev) => [...prev.slice(-4999), { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }])
    requestAnimationFrame(scrollToBottom)
  }

  const clear = () => setEntries([])

  const exportLogs = () => {
    const text = filteredEntries()
      .map((e) => `[${formatTime(e.timestamp)}] [${LOG_LEVEL_LABEL[e.level]}] [${e.channel}] ${e.message}`)
      .join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `output-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weaker-base bg-background-stronger">
        <select
          value={channel()}
          onChange={(e) => setChannel(e.currentTarget.value as OutputChannel)}
          class="px-1.5 py-0.5 text-11-medium bg-surface-base border border-border-weaker-base rounded-md text-text-base focus:outline-none focus:border-accent-base cursor-pointer"
        >
          <For each={CHANNELS}>
            {(ch) => (
              <option value={ch.id}>{ch.label}</option>
            )}
          </For>
        </select>
        <div class="flex items-center gap-0.5">
          <For each={["info", "debug", "warning", "error", "trace"] as LogLevel[]}>
            {(level) => (
              <button
                onClick={() => setLevelFilter(levelFilter() === level ? "all" : level)}
                class="px-1 py-0.5 rounded text-10-medium cursor-pointer transition-colors"
                classList={{
                  "bg-surface-base text-text-base": levelFilter() === level,
                  "text-text-weak hover:text-text-base": levelFilter() !== level,
                }}
              >
                {LOG_LEVEL_LABEL[level]}
              </button>
            )}
          </For>
        </div>
        <div class="flex-1" />
        <input
          type="text"
          placeholder="Filter output..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-2 py-0.5 text-11-regular bg-surface-base border border-border-weaker-base rounded-md text-text-base placeholder:text-text-weaker w-32 focus:outline-none focus:border-accent-base"
        />
        <IconButton
          icon="close"
          variant="ghost"
          iconSize="small"
          onClick={clear}
          aria-label="Clear output"
        />
        <IconButton
          icon="scroll-text"
          variant="ghost"
          iconSize="small"
          onClick={exportLogs}
          aria-label="Export logs"
        />
      </div>
      <div ref={scrollRef} class="flex-1 overflow-auto font-mono text-11-regular">
        <Show
          when={filteredEntries().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-12-regular gap-1">
              <Icon name="scroll-text" size="normal" class="text-text-weaker" />
              <span>No output</span>
            </div>
          }
        >
          <For each={filteredEntries()}>
            {(entry) => (
              <div class="flex items-start gap-2 px-3 py-0.5 hover:bg-background-hover border-b border-border-weaker-base">
                <span class="text-text-weaker shrink-0">{formatTime(entry.timestamp)}</span>
                <span class={`shrink-0 w-10 text-center ${LOG_LEVEL_COLORS[entry.level]}`}>{LOG_LEVEL_LABEL[entry.level]}</span>
                <span class="text-text-weak shrink-0 w-16 truncate">{entry.channel}</span>
                <span class={LOG_LEVEL_COLORS[entry.level]}>{entry.message}</span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
