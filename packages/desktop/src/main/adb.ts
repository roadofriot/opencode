import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { BrowserWindow } from "electron"

export type AdbDevice = {
  serial: string
  state: "device" | "offline" | "unauthorized" | "no permissions"
  model: string
}

const POLL_INTERVAL_MS = 3000

// Common ADB binary locations across Linux, macOS, Windows
const ADB_SEARCH_PATHS = [
  "adb", // PATH
  "/usr/bin/adb",
  "/usr/local/bin/adb",
  join(homedir(), "Android", "Sdk", "platform-tools", "adb"),
  join(homedir(), "android-sdk", "platform-tools", "adb"),
  join(homedir(), ".local", "bin", "adb"),
  // macOS Homebrew / Android Studio
  "/opt/homebrew/bin/adb",
  "/usr/local/share/android-commandlinetools/platform-tools/adb",
  join(homedir(), "Library", "Android", "sdk", "platform-tools", "adb"),
  // Windows
  join(homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe"),
]

function resolveAdb(): string | null {
  // First try PATH directly — fast path, let the shell resolve it
  for (const candidate of ADB_SEARCH_PATHS) {
    if (candidate === "adb") return "adb"
    if (existsSync(candidate)) return candidate
  }
  return null
}

let adbPath: string | null | undefined = undefined // undefined = not yet resolved
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastDeviceJson = ""

function parseAdbDevices(stdout: string): AdbDevice[] {
  const lines = stdout.split("\n").slice(1) // skip "List of devices attached"
  const devices: AdbDevice[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s+/)
    const serial = parts[0]
    if (!serial) continue
    const rawState = parts.slice(1).join(" ").trim()
    const state = (
      rawState === "device" ||
      rawState === "offline" ||
      rawState === "unauthorized" ||
      rawState === "no permissions"
        ? rawState
        : "offline"
    ) as AdbDevice["state"]

    // Parse model from extras like "model:Pixel_7"
    const modelMatch = trimmed.match(/model:(\S+)/)
    const model = modelMatch ? modelMatch[1].replace(/_/g, " ") : serial

    devices.push({ serial, state, model })
  }
  return devices
}

function broadcastDevices(devices: AdbDevice[]) {
  const json = JSON.stringify(devices)
  if (json === lastDeviceJson) return // no change, skip broadcast
  lastDeviceJson = json
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("adb:devices", devices)
  }
}

function poll() {
  if (adbPath === undefined) {
    adbPath = resolveAdb()
    if (adbPath === null) {
      broadcastDevices([])
      return
    }
  }
  if (adbPath === null) {
    broadcastDevices([])
    return
  }

  execFile(adbPath, ["devices", "-l"], { timeout: 5000 }, (err, stdout) => {
    if (err) {
      broadcastDevices([])
      return
    }
    broadcastDevices(parseAdbDevices(stdout))
  })
}

export function listAdbDevices(): Promise<AdbDevice[]> {
  if (adbPath === undefined) adbPath = resolveAdb()
  return new Promise((resolve) => {
    if (!adbPath) return resolve([])
    execFile(adbPath, ["devices", "-l"], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve([])
      resolve(parseAdbDevices(stdout))
    })
  })
}

export function startAdbWatcher() {
  if (pollTimer) return
  poll() // immediate first poll
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
  pollTimer.unref() // don't block app quit
}

export function stopAdbWatcher() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
