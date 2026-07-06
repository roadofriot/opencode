import { createStore } from "solid-js/store"
import { createSimpleContext } from "@mindsparq-ai/ui/context"
import { createMemo, batch, createEffect } from "solid-js"
import { Persist, persisted } from "@/utils/persist"
import { deviceStore, startDeviceDiscovery, stopDeviceDiscovery, detectFlutterProject, setCommandExecutor } from "@/services/device-discovery"
import { browserStore } from "@/services/browser-discovery"
import type { DiscoveredDevice, DiscoveredBrowser, FlutterConfig, FlutterProjectInfo } from "@/services/device-models"
import { useSDK } from "@/context/sdk"
import { terminalWebSocketURL } from "@/utils/terminal-websocket-url"

export type RunState = "idle" | "running" | "debugging" | "paused" | "stopped" | "error"

export interface RunTarget {
  id: string
  name: string
  type: "emulator" | "device" | "browser" | "desktop" | "web-server" | "docker" | "wsl" | "remote"
  platform: string
  available: boolean
  icon: string
  category: "Web" | "Desktop" | "Mobile" | "Terminal"
  flutterId?: string
  isEmulator?: boolean
  isSimulator?: boolean
}

export interface RunConfiguration {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  workingDirectory?: string
  targetId?: string
  framework?: string
  createdAt: number
  lastUsedAt?: number
}

export interface RunningProcess {
  id: string
  terminalId: string
  command: string
  target?: string
  state: RunState
  startedAt: number
  pid?: number
}

export interface FrameworkInfo {
  name: string
  displayName: string
  icon: string
  configFiles: string[]
  runCommands: { label: string; command: string; debug?: string }[]
}

const FRAMEWORKS: FrameworkInfo[] = [
  {
    name: "flutter",
    displayName: "Flutter",
    icon: "smartphone",
    configFiles: ["pubspec.yaml"],
    runCommands: [
      { label: "Run on Chrome", command: "flutter run -d chrome", debug: "flutter run -d chrome --start-paused" },
      { label: "Run on Emulator", command: "flutter run", debug: "flutter run --start-paused" },
      { label: "Run on Linux", command: "flutter run -d linux", debug: "flutter run -d linux --start-paused" },
      { label: "Run on macOS", command: "flutter run -d macos", debug: "flutter run -d macos --start-paused" },
      { label: "Run on Windows", command: "flutter run -d windows", debug: "flutter run -d windows --start-paused" },
    ],
  },
  {
    name: "react",
    displayName: "React",
    icon: "code-lines",
    configFiles: ["package.json"],
    runCommands: [
      { label: "Start Dev Server", command: "npm run dev", debug: "npm run dev" },
      { label: "Start Dev Server (yarn)", command: "yarn dev", debug: "yarn dev" },
    ],
  },
  {
    name: "next",
    displayName: "Next.js",
    icon: "code-lines",
    configFiles: ["next.config.js", "next.config.mjs", "next.config.ts"],
    runCommands: [
      { label: "Start Dev Server", command: "npm run dev", debug: "npm run dev" },
      { label: "Build", command: "npm run build", debug: "npm run build" },
    ],
  },
  {
    name: "vue",
    displayName: "Vue",
    icon: "code-lines",
    configFiles: ["vue.config.js", "vite.config.ts", "vite.config.js"],
    runCommands: [
      { label: "Start Dev Server", command: "npm run dev", debug: "npm run dev" },
    ],
  },
  {
    name: "angular",
    displayName: "Angular",
    icon: "code-lines",
    configFiles: ["angular.json"],
    runCommands: [
      { label: "Start Dev Server", command: "ng serve", debug: "ng serve --open" },
    ],
  },
  {
    name: "node",
    displayName: "Node.js",
    icon: "code-lines",
    configFiles: ["package.json"],
    runCommands: [
      { label: "Start", command: "npm start", debug: "node --inspect src/index.js" },
      { label: "Dev Server", command: "npm run dev", debug: "npm run dev" },
    ],
  },
  {
    name: "python",
    displayName: "Python",
    icon: "code-lines",
    configFiles: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
    runCommands: [
      { label: "Run Main", command: "python main.py", debug: "python -m pdb main.py" },
      { label: "Run App", command: "python app.py", debug: "python -m pdb app.py" },
    ],
  },
  {
    name: "django",
    displayName: "Django",
    icon: "code-lines",
    configFiles: ["manage.py"],
    runCommands: [
      { label: "Run Server", command: "python manage.py runserver", debug: "python manage.py runserver --no-reload" },
    ],
  },
  {
    name: "fastapi",
    displayName: "FastAPI",
    icon: "code-lines",
    configFiles: ["requirements.txt", "pyproject.toml"],
    runCommands: [
      { label: "Run Server", command: "uvicorn main:app --reload", debug: "uvicorn main:app --reload" },
    ],
  },
  {
    name: "rust",
    displayName: "Rust",
    icon: "code-lines",
    configFiles: ["Cargo.toml"],
    runCommands: [
      { label: "Run", command: "cargo run", debug: "cargo run" },
      { label: "Run Release", command: "cargo run --release", debug: "cargo run --release" },
    ],
  },
  {
    name: "go",
    displayName: "Go",
    icon: "code-lines",
    configFiles: ["go.mod"],
    runCommands: [
      { label: "Run", command: "go run .", debug: "dlv debug" },
    ],
  },
  {
    name: "java",
    displayName: "Java",
    icon: "code-lines",
    configFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
    runCommands: [
      { label: "Run", command: "mvn compile exec:java", debug: "mvn compile exec:java" },
    ],
  },
  {
    name: "laravel",
    displayName: "Laravel",
    icon: "code-lines",
    configFiles: ["artisan", "composer.json"],
    runCommands: [
      { label: "Start Dev Server", command: "php artisan serve", debug: "php artisan serve" },
    ],
  },
]

function detectFramework(files: string[]): FrameworkInfo | undefined {
  // Check for Flutter first (pubspec.yaml + flutter dependency or platform directories)
  const flutterInfo = detectFlutterProject(files)
  if (flutterInfo.isFlutter) {
    return FRAMEWORKS.find((f) => f.name === "flutter")
  }

  // Check for other frameworks
  for (const framework of FRAMEWORKS) {
    if (framework.configFiles.some((cf) => files.includes(cf))) {
      return framework
    }
  }
  return undefined
}

function detectFrameworkFromPath(filePaths: string[]): FrameworkInfo | undefined {
  const fileNames = filePaths.map((p) => p.split("/").pop() ?? p)
  return detectFramework(fileNames)
}

function generateFlutterRunCommand(target: RunTarget, debug: boolean = false): string {
  const flutterId = target.flutterId || target.id
  const baseCmd = debug ? "flutter run --start-paused" : "flutter run"

  // Map target IDs to flutter device IDs
  if (flutterId === "chrome" || flutterId === "firefox" || flutterId === "edge") {
    return `${baseCmd} -d ${flutterId}`
  }
  if (flutterId === "linux" || flutterId === "windows" || flutterId === "macos") {
    return `${baseCmd} -d ${flutterId}`
  }
  if (target.platform === "android" || target.platform === "ios") {
    // For mobile devices/emulators, use the device ID directly
    return `${baseCmd} -d ${flutterId}`
  }
  // Default: try to use the flutter ID
  return `${baseCmd} -d ${flutterId}`
}

export interface RunServiceState {
  state: RunState
  activeProcess?: RunningProcess
  configurations: RunConfiguration[]
  recentTargets: string[]
  lastConfig?: string
  lastSelectedTargetId?: string
  lastBrowser?: string
}

export const { use: useRunService, provider: RunServiceProvider } = createSimpleContext({
  name: "RunService",
  gate: false,
  init: () => {
    const [store, setStore] = createStore<RunServiceState>({
      state: "idle",
      configurations: [],
      recentTargets: [],
    })

    const state = createMemo(() => store.state)
    const isRunning = createMemo(() => store.state === "running" || store.state === "debugging")
    const activeProcess = createMemo(() => store.activeProcess)

    const lastSelectedTargetId = createMemo(() => store.lastSelectedTargetId)

    const allTargets = createMemo<RunTarget[]>(() => {
      const targets: RunTarget[] = []
      const flutterConf = deviceStore.flutterConfig()
      const flutterDevices = deviceStore.flutterDevices()
      const detectedBrowsers = browserStore.browsers()

      // Desktop Targets — always available when Flutter SDK is present
      targets.push({
        id: "linux-desktop",
        name: "Linux Desktop",
        type: "desktop",
        platform: "linux",
        available: true,
        icon: "monitor",
        category: "Desktop",
        flutterId: "linux",
      })

      targets.push({
        id: "windows-desktop",
        name: "Windows Desktop",
        type: "desktop",
        platform: "windows",
        available: true,
        icon: "monitor",
        category: "Desktop",
        flutterId: "windows",
      })

      targets.push({
        id: "macos-desktop",
        name: "macOS Desktop",
        type: "desktop",
        platform: "macos",
        available: true,
        icon: "monitor",
        category: "Desktop",
        flutterId: "macos",
      })

      // Mobile Targets
      // Android Emulator
      const activeAndroidEmulator = flutterDevices.find((d) => d.platform === "android" && d.emulator)
      targets.push({
        id: activeAndroidEmulator?.id ?? "android-emulator",
        name: activeAndroidEmulator ? activeAndroidEmulator.name : "Android Emulator",
        type: "emulator",
        platform: "android",
        available: !!activeAndroidEmulator,
        icon: "smartphone",
        category: "Mobile",
        flutterId: activeAndroidEmulator?.id ?? "android",
        isEmulator: true,
      })

      // Android Physical Device / Connected Android Device
      const activeAndroidDevice = flutterDevices.find((d) => d.platform === "android" && !d.emulator)
      targets.push({
        id: activeAndroidDevice?.id ?? "android-device",
        name: activeAndroidDevice ? activeAndroidDevice.name : "Android Physical Device",
        type: "device",
        platform: "android",
        available: !!activeAndroidDevice,
        icon: "smartphone",
        category: "Mobile",
        flutterId: activeAndroidDevice?.id ?? "android",
      })

      // iOS Simulator
      const activeIosSimulator = flutterDevices.find((d) => d.platform === "ios" && d.simulator)
      targets.push({
        id: activeIosSimulator?.id ?? "ios-simulator",
        name: activeIosSimulator ? activeIosSimulator.name : "iOS Simulator",
        type: "emulator",
        platform: "ios",
        available: !!activeIosSimulator,
        icon: "smartphone",
        category: "Mobile",
        flutterId: activeIosSimulator?.id ?? "ios",
        isSimulator: true,
      })

      // Connected iPhone
      const activeIosDevice = flutterDevices.find((d) => d.platform === "ios" && !d.simulator)
      targets.push({
        id: activeIosDevice?.id ?? "ios-device",
        name: activeIosDevice ? activeIosDevice.name : "Connected iPhone",
        type: "device",
        platform: "ios",
        available: !!activeIosDevice,
        icon: "smartphone",
        category: "Mobile",
        flutterId: activeIosDevice?.id ?? "ios",
      })

      // Web Targets
      const browsersList = ["chrome", "edge", "firefox", "safari"]
      for (const browserId of browsersList) {
        const activeBrowser = detectedBrowsers.find((b) => b.id === browserId)
        const isDiscoveredWeb = flutterDevices.some((d) => d.platform === "web" && d.id === browserId)
        const available = (activeBrowser?.available ?? false) || isDiscoveredWeb
        const nameMap: Record<string, string> = {
          chrome: "Google Chrome",
          edge: "Microsoft Edge",
          firefox: "Mozilla Firefox",
          safari: "Safari",
        }
        targets.push({
          id: browserId,
          name: nameMap[browserId] ?? browserId,
          type: "browser",
          platform: "web",
          available,
          icon: "globe",
          category: "Web",
          flutterId: browserId,
        })
      }

      // Add terminal target always available
      targets.push({
        id: "terminal",
        name: "Terminal",
        type: "desktop",
        platform: "linux",
        available: true,
        icon: "terminal",
        category: "Terminal",
      })

      return targets
    })

    const targetsByCategory = createMemo(() => {
      const cats: Record<string, RunTarget[]> = {}
      for (const t of allTargets()) {
        if (!cats[t.category]) cats[t.category] = []
        cats[t.category].push(t)
      }
      return cats
    })

    const selectedTarget = createMemo(() => {
      const tid = store.lastSelectedTargetId
      if (!tid) return allTargets()[0]
      return allTargets().find((t) => t.id === tid) ?? allTargets()[0]
    })

    function selectTarget(targetId: string) {
      setStore("lastSelectedTargetId", targetId)
    }

    const detectProject = (files: string[]) => {
      return detectFrameworkFromPath(files)
    }

    const getRunConfig = (framework: FrameworkInfo | undefined, files: string[], target?: RunTarget) => {
      if (framework) {
        const entry = files.find((f) => f.endsWith(".dart") || f.endsWith("main.py") || f.endsWith("index.ts") || f.endsWith("index.js"))

        // For Flutter, generate command based on selected target
        if (framework.name === "flutter" && target) {
          const command = generateFlutterRunCommand(target, false)
          const debugCommand = generateFlutterRunCommand(target, true)
          return {
            framework,
            command,
            debugCommand,
            entryFile: entry,
          }
        }

        return {
          framework,
          command: framework.runCommands[0]?.command ?? "",
          debugCommand: framework.runCommands[0]?.debug,
          entryFile: entry,
        }
      }
      return undefined
    }

    const startRun = (command: string, terminalId: string, options?: { target?: string; debug?: boolean }) => {
      batch(() => {
        setStore("state", options?.debug ? "debugging" : "running")
        setStore("activeProcess", {
          id: `proc-${Date.now()}`,
          terminalId,
          command,
          target: options?.target,
          state: options?.debug ? "debugging" : "running",
          startedAt: Date.now(),
        })
        if (options?.target) {
          setStore("lastSelectedTargetId", options.target)
          setStore("recentTargets", (prev) => {
            const next = [options.target!, ...prev.filter((t) => t !== options.target)]
            return next.slice(0, 10)
          })
        }
      })
    }

    const stopRun = () => {
      batch(() => {
        setStore("state", "stopped")
        setStore("activeProcess", undefined)
        setTimeout(() => setStore("state", "idle"), 1500)
      })
    }

    const errorRun = () => {
      batch(() => {
        setStore("state", "error")
        setStore("activeProcess", undefined)
        setTimeout(() => setStore("state", "idle"), 3000)
      })
    }

    const saveConfig = (config: Omit<RunConfiguration, "id" | "createdAt">) => {
      const id = `config-${Date.now()}`
      setStore("configurations", (prev) => [
        ...prev,
        { ...config, id, createdAt: Date.now() },
      ])
      return id
    }

    const deleteConfig = (id: string) => {
      setStore("configurations", (prev) => prev.filter((c) => c.id !== id))
    }

    const updateConfig = (id: string, updates: Partial<RunConfiguration>) => {
      setStore("configurations", (prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      )
    }

    const setLastConfig = (id: string) => setStore("lastConfig", id)
    const setLastBrowser = (name: string) => setStore("lastBrowser", name)

    const sdk = useSDK()
    createEffect(() => {
      const currentSdk = sdk()
      if (!currentSdk) return

      setCommandExecutor(async (command: string) => {
        const client = currentSdk.client
        const pty = await client.pty.create({ title: "device-discovery" })
        if (pty.error) return ""
        const ptyID = pty.data.id

        const ticket = await client.pty.connectToken({ ptyID }).then((r) => r.data?.ticket).catch(() => undefined)

        return new Promise<string>((resolve) => {
          const wsUrl = terminalWebSocketURL({
            url: currentSdk.url,
            id: ptyID,
            directory: currentSdk.directory,
            cursor: 0,
            ticket,
          })
          const ws = new WebSocket(wsUrl.toString())
          let output = ""
          let timer: any

          const cleanup = () => {
            clearTimeout(timer)
            ws.close()
            client.pty.remove({ ptyID }).catch(() => {})
          }

          ws.onopen = () => {
            ws.send(`${command}\n`)
            timer = setTimeout(() => {
              cleanup()
              resolve(output)
            }, 3000)
          }

          ws.onmessage = (event) => {
            if (typeof event.data === "string") {
              output += event.data
            }
          }

          ws.onclose = () => {
            cleanup()
            resolve(output)
          }

          ws.onerror = () => {
            cleanup()
            resolve(output)
          }
        })
      })
    })

    createEffect(() => {
      startDeviceDiscovery()
      browserStore.refresh()
    })

    return {
      state,
      isRunning,
      activeProcess,
      configurations: createMemo(() => store.configurations),
      recentTargets: createMemo(() => store.recentTargets),
      lastConfig: createMemo(() => store.lastConfig),
      lastSelectedTargetId,
      lastBrowser: createMemo(() => store.lastBrowser),
      allTargets,
      targetsByCategory,
      selectedTarget,
      selectTarget,
      detectProject,
      getRunConfig,
      startRun,
      stopRun,
      errorRun,
      saveConfig,
      deleteConfig,
      updateConfig,
      setLastConfig,
      setLastBrowser,
      detectFramework: detectFrameworkFromPath,
      flutterProjectInfo: createMemo(() => deviceStore.projectInfo()),
      flutterAvailable: createMemo(() => deviceStore.flutterAvailable()),
      refreshDevices: deviceStore.refresh,
      refreshProjectInfo: deviceStore.refreshProjectInfo,
    }
  },
})
