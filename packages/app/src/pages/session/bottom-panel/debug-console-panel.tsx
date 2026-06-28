import { createSignal, For, Show, createMemo, onCleanup, onMount } from "solid-js"
import { Icon } from "@mindsparq-ai/ui/icon"
import { IconButton } from "@mindsparq-ai/ui/icon-button"

interface DebugEntry {
  id: string
  type: "input" | "output" | "error" | "info"
  content: string
  timestamp: number
}

export function DebugConsolePanel() {
  const [entries, setEntries] = createSignal<DebugEntry[]>([])
  const [input, setInput] = createSignal("")
  const [history, setHistory] = createSignal<string[]>([])
  const [historyIndex, setHistoryIndex] = createSignal(-1)
  let scrollRef: HTMLDivElement | undefined
  let inputRef: HTMLInputElement | undefined

  const scrollToBottom = () => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  }

  const addEntry = (type: DebugEntry["type"], content: string) => {
    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        content,
        timestamp: Date.now(),
      },
    ])
    requestAnimationFrame(scrollToBottom)
  }

  const evaluate = (expr: string) => {
    addEntry("input", expr)
    setHistory((prev) => [...prev, expr])
    setHistoryIndex(-1)

    try {
      const result = (0, eval)(`"use strict"; (${expr})`)
      addEntry("output", String(result))
    } catch (e) {
      addEntry("error", e instanceof Error ? e.message : String(e))
    }
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const value = input().trim()
    if (!value) return
    evaluate(value)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const h = history()
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const idx = historyIndex()
      if (idx < h.length - 1) {
        const next = idx + 1
        setHistoryIndex(next)
        setInput(h[h.length - 1 - next])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const idx = historyIndex()
      if (idx > 0) {
        const next = idx - 1
        setHistoryIndex(next)
        setInput(h[h.length - 1 - next])
      } else if (idx === 0) {
        setHistoryIndex(-1)
        setInput("")
      }
    }
  }

  const clear = () => setEntries([])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weaker-base bg-background-stronger">
        <Icon name="play-circle" size="small" class="text-text-weak" />
        <span class="text-11-medium text-text-base">Debug Console</span>
        <div class="flex-1" />
        <IconButton
          icon="close"
          variant="ghost"
          iconSize="small"
          onClick={clear}
          aria-label="Clear console"
        />
      </div>
      <div ref={scrollRef} class="flex-1 overflow-auto font-mono text-11-regular">
        <Show
          when={entries().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-12-regular gap-1">
              <Icon name="play-circle" size="normal" class="text-text-weaker" />
              <span>Type an expression to evaluate</span>
            </div>
          }
        >
          <For each={entries()}>
            {(entry) => (
              <div class="flex items-start gap-2 px-3 py-0.5 hover:bg-background-hover">
                <span class="text-text-weaker shrink-0">{formatTime(entry.timestamp)}</span>
                <Show when={entry.type === "input"}>
                  <span class="text-text-weak shrink-0">&gt;</span>
                  <span class="text-text-base">{entry.content}</span>
                </Show>
                <Show when={entry.type === "output"}>
                  <span class="text-blue-400 shrink-0">&lt;</span>
                  <span class="text-text-base">{entry.content}</span>
                </Show>
                <Show when={entry.type === "error"}>
                  <span class="text-red-500 shrink-0">!</span>
                  <span class="text-red-500">{entry.content}</span>
                </Show>
                <Show when={entry.type === "info"}>
                  <span class="text-text-weak shrink-0">i</span>
                  <span class="text-text-weak">{entry.content}</span>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>
      <form onSubmit={handleSubmit} class="flex items-center gap-2 px-3 py-1.5 border-t border-border-weaker-base bg-background-stronger">
        <span class="text-text-weak text-12-regular">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Evaluate expression..."
          class="flex-1 bg-transparent text-12-regular text-text-base placeholder:text-text-weaker focus:outline-none font-mono"
        />
      </form>
    </div>
  )
}
