import { createSignal, createRoot } from "solid-js"
import type { DiscoveredDevice, FlutterDevice, FlutterConfig, FlutterProjectInfo } from "./device-models"

const POLL_INTERVAL_MS = 10000
const FLUTTER_DEVICES_CACHE_MS = 5000

type CommandExecutor = (command: string) => Promise<string>

let commandExecutor: CommandExecutor | null = null

function createDeviceStore() {
  const [devices, setDevices] = createSignal<DiscoveredDevice[]>([])
  const [flutterDevices, setFlutterDevices] = createSignal<FlutterDevice[]>([])
  const [flutterConfig, setFlutterConfig] = createSignal<FlutterConfig>({
    enableLinuxDesktop: false,
    enableWindowsDesktop: false,
    enableMacosDesktop: false,
  })
  const [loading, setLoading] = createSignal(false)
  const [lastRefresh, setLastRefresh] = createSignal(0)
  const [flutterAvailable, setFlutterAvailable] = createSignal(false)
  const [projectInfo, setProjectInfo] = createSignal<FlutterProjectInfo>({
    isFlutter: false,
    isDartOnly: false,
    platforms: [],
    hasAndroid: false,
    hasIos: false,
    hasWeb: false,
    hasLinux: false,
    hasWindows: false,
    hasMacos: false,
  })

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastFlutterDevicesFetch = 0

  async function runCommand(cmd: string): Promise<string> {
    if (!commandExecutor) return ""
    try {
      return await commandExecutor(cmd)
    } catch {
      return ""
    }
  }

  async function detectFlutterAvailable(): Promise<boolean> {
    const result = await runCommand("which flutter 2>/dev/null || where flutter 2>NUL")
    return result.trim().length > 0
  }

  async function fetchFlutterDevices(): Promise<FlutterDevice[]> {
    const now = Date.now()
    if (now - lastFlutterDevicesFetch < FLUTTER_DEVICES_CACHE_MS) {
      return flutterDevices()
    }

    const output = await runCommand("flutter devices --machine 2>/dev/null || echo '[]'")
    lastFlutterDevicesFetch = now

    try {
      const parsed = JSON.parse(output)
      if (Array.isArray(parsed)) {
        return parsed.map((d: any) => ({
          id: d.id || "",
          name: d.name || "Unknown Device",
          platform: d.platform || "unknown",
          emulator: d.emulator === true,
          simulator: d.simulator === true,
          systemIcon: d.systemIcon,
          flutterVersion: d.flutterVersion ? String(d.flutterVersion) : undefined,
        }))
      }
    } catch {
      // Fallback: try to parse non-machine output
      return parseFlutterDevicesText(output)
    }
    return []
  }

  function parseFlutterDevicesText(output: string): FlutterDevice[] {
    const devices: FlutterDevice[] = []
    const lines = output.split("\n")

    for (const line of lines) {
      // Match lines like: "sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64 • Android 13 (API 33)"
      const match = line.match(/^(\S.+?)\s+•\s+(\S+)\s+•\s+(\S+)\s+•\s+(.+)$/)
      if (match) {
        const [, name, id, platform, version] = match
        const isEmulator = id.includes("emulator") || name.toLowerCase().includes("emulator")
        const isSimulator = id.includes("simulator") || name.toLowerCase().includes("simulator")
        devices.push({
          id,
          name: name.trim(),
          platform: platform.split("-")[0],
          emulator: isEmulator,
          simulator: isSimulator,
        })
      }
    }
    return devices
  }

  async function fetchFlutterConfig(): Promise<FlutterConfig> {
    const output = await runCommand("flutter config --machine 2>/dev/null || echo '{}'")
    try {
      const parsed = JSON.parse(output)
      const enableLinuxDesktop = parsed["enable-linux-desktop"] === true
      const enableWindowsDesktop = parsed["enable-windows-desktop"] === true
      const enableMacosDesktop = parsed["enable-macos-desktop"] === true
      return {
        enableLinuxDesktop,
        enableWindowsDesktop,
        enableMacosDesktop,
      }
    } catch {
      return {
        enableLinuxDesktop: false,
        enableWindowsDesktop: false,
        enableMacosDesktop: false,
      }
    }
  }

  async function detectFlutterProject(files: string[]): Promise<FlutterProjectInfo> {
    const hasPubspec = files.includes("pubspec.yaml")
    if (!hasPubspec) {
      return {
        isFlutter: false,
        isDartOnly: false,
        platforms: [],
        hasAndroid: false,
        hasIos: false,
        hasWeb: false,
        hasLinux: false,
        hasWindows: false,
        hasMacos: false,
      }
    }

    const hasAndroid = files.some(f => f.startsWith("android/") || f === "android")
    const hasIos = files.some(f => f.startsWith("ios/") || f === "ios")
    const hasWeb = files.some(f => f.startsWith("web/") || f === "web")
    const hasLinux = files.some(f => f.startsWith("linux/") || f === "linux")
    const hasWindows = files.some(f => f.startsWith("windows/") || f === "windows")
    const hasMacos = files.some(f => f.startsWith("macos/") || f === "macos")

    const platforms: string[] = []
    if (hasAndroid) platforms.push("android")
    if (hasIos) platforms.push("ios")
    if (hasWeb) platforms.push("web")
    if (hasLinux) platforms.push("linux")
    if (hasWindows) platforms.push("windows")
    if (hasMacos) platforms.push("macos")

    const isFlutter = platforms.length > 0 || await checkFlutterDependency()
    const isDartOnly = !isFlutter && hasPubspec

    return {
      isFlutter,
      isDartOnly,
      platforms,
      hasAndroid,
      hasIos,
      hasWeb,
      hasLinux,
      hasWindows,
      hasMacos,
    }
  }

  async function checkFlutterDependency(): Promise<boolean> {
    const output = await runCommand("grep -l 'flutter:' pubspec.yaml 2>/dev/null && echo 'yes' || echo 'no'")
    return output.trim() === "yes"
  }

  function buildDeviceList(flutterDevs: FlutterDevice[], config: FlutterConfig): DiscoveredDevice[] {
    const result: DiscoveredDevice[] = []

    for (const dev of flutterDevs) {
      let platform: DiscoveredDevice["platform"] = "device"
      let type: DiscoveredDevice["type"] = "phone"

      if (dev.platform === "android") {
        platform = "android"
        type = dev.emulator ? "emulator" : "phone"
      } else if (dev.platform === "ios") {
        platform = "ios"
        type = dev.simulator ? "emulator" : "phone"
      } else if (dev.platform === "web") {
        platform = "web"
        type = "browser"
      } else if (dev.platform === "linux") {
        platform = "linux"
        type = "desktop"
      } else if (dev.platform === "windows") {
        platform = "windows"
        type = "desktop"
      } else if (dev.platform === "macos") {
        platform = "macos"
        type = "desktop"
      }

      result.push({
        id: dev.id,
        name: dev.name,
        platform,
        type,
        available: true,
        flutterId: dev.id,
        isEmulator: dev.emulator,
        isSimulator: dev.simulator,
      })
    }

    // Add web browsers if Flutter web is supported
    if (config.enableLinuxDesktop || result.some(d => d.platform === "web")) {
      result.push(
        { id: "chrome", name: "Chrome", platform: "web", type: "browser", available: true, flutterId: "chrome" },
        { id: "firefox", name: "Firefox", platform: "web", type: "browser", available: true, flutterId: "firefox" },
        { id: "edge", name: "Edge", platform: "web", type: "browser", available: true, flutterId: "edge" },
      )
    }

    // Add desktop targets based on config
    if (config.enableLinuxDesktop && !result.some(d => d.platform === "linux")) {
      result.push({
        id: "linux-desktop",
        name: "Linux Desktop",
        platform: "linux",
        type: "desktop",
        available: true,
        flutterId: "linux",
      })
    }
    if (config.enableWindowsDesktop && !result.some(d => d.platform === "windows")) {
      result.push({
        id: "windows-desktop",
        name: "Windows Desktop",
        platform: "windows",
        type: "desktop",
        available: true,
        flutterId: "windows",
      })
    }
    if (config.enableMacosDesktop && !result.some(d => d.platform === "macos")) {
      result.push({
        id: "macos-desktop",
        name: "macOS Desktop",
        platform: "macos",
        type: "desktop",
        available: true,
        flutterId: "macos",
      })
    }

    return result
  }

  async function refresh() {
    setLoading(true)
    try {
      const isFlutterAvailable = await detectFlutterAvailable()
      setFlutterAvailable(isFlutterAvailable)

      if (isFlutterAvailable) {
        const [flutterDevs, config] = await Promise.all([
          fetchFlutterDevices(),
          fetchFlutterConfig(),
        ])

        setFlutterDevices(flutterDevs)
        setFlutterConfig(config)
        setDevices(buildDeviceList(flutterDevs, config))
      } else {
        // Set default browsers when Flutter is not available
        setDevices([
          { id: "chrome", name: "Chrome", platform: "web", type: "browser", available: true },
          { id: "firefox", name: "Firefox", platform: "web", type: "browser", available: true },
          { id: "edge", name: "Edge", platform: "web", type: "browser", available: true },
        ])
      }

      setLastRefresh(Date.now())
    } finally {
      setLoading(false)
    }
  }

  async function refreshProjectInfo(files: string[]) {
    const info = await detectFlutterProject(files)
    setProjectInfo(info)
  }

  function startPolling() {
    if (pollTimer) return
    refresh()
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return {
    devices,
    flutterDevices,
    flutterConfig,
    flutterAvailable,
    projectInfo,
    loading,
    lastRefresh,
    refresh,
    refreshProjectInfo,
    startPolling,
    stopPolling,
  }
}

export const deviceStore = createDeviceStore()

export function startDeviceDiscovery() {
  deviceStore.startPolling()
}

export function stopDeviceDiscovery() {
  deviceStore.stopPolling()
}

export function setTerminalGetter(getter: () => any) {
  // Store the getter for command execution
  commandExecutor = async (cmd: string) => {
    const terminal = getter()
    if (!terminal) return ""
    // This would need to be implemented to actually execute commands
    // For now, we'll use a placeholder
    return ""
  }
}

export function setCommandExecutor(executor: CommandExecutor) {
  commandExecutor = executor
}

export function detectFlutterProject(files: string[]): FlutterProjectInfo {
  const hasPubspec = files.includes("pubspec.yaml")
  if (!hasPubspec) {
    return {
      isFlutter: false,
      isDartOnly: false,
      platforms: [],
      hasAndroid: false,
      hasIos: false,
      hasWeb: false,
      hasLinux: false,
      hasWindows: false,
      hasMacos: false,
    }
  }

  const hasAndroid = files.some(f => f.startsWith("android/") || f === "android")
  const hasIos = files.some(f => f.startsWith("ios/") || f === "ios")
  const hasWeb = files.some(f => f.startsWith("web/") || f === "web")
  const hasLinux = files.some(f => f.startsWith("linux/") || f === "linux")
  const hasWindows = files.some(f => f.startsWith("windows/") || f === "windows")
  const hasMacos = files.some(f => f.startsWith("macos/") || f === "macos")

  const platforms: string[] = []
  if (hasAndroid) platforms.push("android")
  if (hasIos) platforms.push("ios")
  if (hasWeb) platforms.push("web")
  if (hasLinux) platforms.push("linux")
  if (hasWindows) platforms.push("windows")
  if (hasMacos) platforms.push("macos")

  // If we have platform directories, it's likely a Flutter project
  const isFlutter = platforms.length > 0
  const isDartOnly = !isFlutter && hasPubspec

  return {
    isFlutter,
    isDartOnly,
    platforms,
    hasAndroid,
    hasIos,
    hasWeb,
    hasLinux,
    hasWindows,
    hasMacos,
  }
}