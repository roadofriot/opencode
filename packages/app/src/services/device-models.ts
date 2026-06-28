export interface DiscoveredDevice {
  id: string
  name: string
  platform: "android" | "ios" | "web" | "linux" | "windows" | "macos" | "emulator" | "device"
  type: "phone" | "emulator" | "browser" | "desktop" | "web-server"
  available: boolean
  version?: string
  executablePath?: string
  flutterId?: string
  isEmulator?: boolean
  isSimulator?: boolean
}

export interface DiscoveredBrowser {
  id: string
  name: string
  executablePath: string
  version?: string
  available: boolean
}

export interface FlutterDevice {
  id: string
  name: string
  platform: string
  emulator?: boolean
  simulator?: boolean
  systemIcon?: string
  flutterVersion?: string
}

export interface FlutterConfig {
  enableLinuxDesktop: boolean
  enableWindowsDesktop: boolean
  enableMacosDesktop: boolean
}

export interface FlutterProjectInfo {
  isFlutter: boolean
  isDartOnly: boolean
  platforms: string[]
  hasAndroid: boolean
  hasIos: boolean
  hasWeb: boolean
  hasLinux: boolean
  hasWindows: boolean
  hasMacos: boolean
}

export function deviceIcon(device: DiscoveredDevice): string {
  if (device.isEmulator || device.isSimulator) return "play-circle"
  switch (device.type) {
    case "phone":
      return "smartphone"
    case "emulator":
      return "play-circle"
    case "browser":
      return "globe"
    case "desktop":
      return "monitor"
    case "web-server":
      return "server"
    default:
      return "terminal"
  }
}

export function deviceCategoryLabel(device: DiscoveredDevice): string {
  switch (device.platform) {
    case "android":
      return "Mobile"
    case "ios":
      return "Mobile"
    case "web":
      return "Web"
    case "linux":
    case "windows":
    case "macos":
      return "Desktop"
    default:
      return "Other"
  }
}

export function flutterDeviceTypeLabel(device: FlutterDevice): string {
  if (device.emulator) return "Emulator"
  if (device.simulator) return "Simulator"
  if (device.platform === "web") return "Browser"
  if (["linux", "windows", "macos"].includes(device.platform)) return "Desktop"
  return "Device"
}
