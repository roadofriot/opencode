import { createSignal, For, Show, createMemo, onMount, onCleanup } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

export interface PortEntry {
  port: number
  protocol: string
  processName: string
  pid: number
  status: "listening" | "closed"
  visibility: "public" | "private"
  url: string
}

export function PortsPanel() {
  const [ports, setPorts] = createSignal<PortEntry[]>([])
  const [search, setSearch] = createSignal("")

  const filteredPorts = createMemo(() => {
    const query = search().toLowerCase()
    if (!query) return ports()
    return ports().filter(
      (p) =>
        String(p.port).includes(query) ||
        p.processName.toLowerCase().includes(query) ||
        p.url.toLowerCase().includes(query),
    )
  })

  const formatStatus = (status: PortEntry["status"]) => {
    return status === "listening" ? "Active" : "Closed"
  }

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weaker-base bg-background-stronger">
        <Icon name="network" size="small" class="text-text-weak" />
        <span class="text-11-medium text-text-base">Ports</span>
        <span class="text-10-regular text-text-weaker">({ports().length})</span>
        <div class="flex-1" />
        <input
          type="text"
          placeholder="Filter ports..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-2 py-0.5 text-11-regular bg-surface-base border border-border-weaker-base rounded-md text-text-base placeholder:text-text-weaker w-32 focus:outline-none focus:border-accent-base"
        />
      </div>
      <div class="flex-1 overflow-auto">
        <Show
          when={filteredPorts().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-12-regular gap-1">
              <Icon name="network" size="normal" class="text-text-weaker" />
              <span>No ports detected</span>
              <span class="text-10-regular text-text-weaker">Local servers will appear here</span>
            </div>
          }
        >
          <table class="w-full text-11-regular">
            <thead>
              <tr class="border-b border-border-weaker-base text-text-weak">
                <th class="text-left px-3 py-1.5 font-medium">Port</th>
                <th class="text-left px-3 py-1.5 font-medium">Protocol</th>
                <th class="text-left px-3 py-1.5 font-medium">Process</th>
                <th class="text-left px-3 py-1.5 font-medium">PID</th>
                <th class="text-left px-3 py-1.5 font-medium">Status</th>
                <th class="text-left px-3 py-1.5 font-medium">Visibility</th>
                <th class="text-right px-3 py-1.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredPorts()}>
                {(port) => (
                  <tr class="border-b border-border-weaker-base hover:bg-background-hover">
                    <td class="px-3 py-1.5 text-text-base font-mono">{port.port}</td>
                    <td class="px-3 py-1.5 text-text-weak">{port.protocol}</td>
                    <td class="px-3 py-1.5 text-text-base">{port.processName}</td>
                    <td class="px-3 py-1.5 text-text-weak font-mono">{port.pid}</td>
                    <td class="px-3 py-1.5">
                      <span
                        class="inline-flex items-center gap-1"
                        classList={{
                          "text-green-500": port.status === "listening",
                          "text-text-weaker": port.status === "closed",
                        }}
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-current" />
                        {formatStatus(port.status)}
                      </span>
                    </td>
                    <td class="px-3 py-1.5 text-text-weak">{port.visibility}</td>
                    <td class="px-3 py-1.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <IconButton
                          icon="square-arrow-top-right"
                          variant="ghost"
                          iconSize="small"
                          onClick={() => window.open(port.url, "_blank")}
                          aria-label="Open in browser"
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  )
}
