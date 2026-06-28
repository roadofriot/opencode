import { createSignal } from "solid-js"
import type { DiscoveredBrowser } from "./device-models"

function createBrowserStore() {
  const [browsers, setBrowsers] = createSignal<DiscoveredBrowser[]>([
    { id: "chrome", name: "Google Chrome", executablePath: "google-chrome", available: true },
    { id: "firefox", name: "Mozilla Firefox", executablePath: "firefox", available: true },
    { id: "edge", name: "Microsoft Edge", executablePath: "microsoft-edge", available: true },
  ])
  const [loading, setLoading] = createSignal(false)

  async function refresh() {}

  return { browsers, loading, refresh }
}

export const browserStore = createBrowserStore()

export function detectBrowserForTarget(targetId: string): DiscoveredBrowser | undefined {
  return browserStore.browsers().find((b) => b.id === targetId)
}

export async function isBrowserAvailable(targetId: string): Promise<boolean> {
  return browserStore.browsers().some((b) => b.id === targetId)
}

export function setTerminalGetter(_getter: () => any) {}
