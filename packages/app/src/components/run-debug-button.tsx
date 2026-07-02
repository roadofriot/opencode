import { createSignal, Show, For, createMemo, onMount } from "solid-js"
import { Icon } from "@mindsparq-ai/ui/icon"
import { Button } from "@mindsparq-ai/ui/button"
import { Card } from "@mindsparq-ai/ui/card"
import { useRunService, type RunConfiguration, type FrameworkInfo } from "@/context/run-service"
import { useTerminal, sendTerminalCommand } from "@/context/terminal"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useSDK } from "@/context/sdk"
import { ProjectBadge } from "@/components/project-badge"

export interface RunDebugButtonProps {
  directory?: string
}

function generateFallbackCommand(target: { id: string; name: string; platform: string; flutterId?: string }, debug = false): string {
  if (target.platform === "linux" || target.platform === "windows" || target.platform === "macos") {
    const flutterId = target.flutterId ?? target.platform
    return debug ? `flutter run -d ${flutterId} --start-paused` : `flutter run -d ${flutterId}`
  }
  if (target.platform === "android" || target.platform === "ios") {
    const flutterId = target.flutterId ?? target.platform
    return debug ? `flutter run -d ${flutterId} --start-paused` : `flutter run -d ${flutterId}`
  }
  if (target.platform === "chrome" || target.platform === "firefox" || target.platform === "edge") {
    return debug ? `flutter run -d ${target.platform} --start-paused` : `flutter run -d ${target.platform}`
  }
  return `echo 'Run on ${target.name}'`
}

export function RunDebugButton(props: RunDebugButtonProps) {
  const run = useRunService()
  const terminal = useTerminal()
  const layout = useLayout()
  const sdk = useSDK()
  const [isOpen, setIsOpen] = createSignal(false)
  const [isHovered, setIsHovered] = createSignal(false)
  const [projectFiles, setProjectFiles] = createSignal<string[]>([])
  const projects = createMemo(() => layout.projects.list())
  const [selectedProjectDir, setSelectedProjectDir] = createSignal<string | undefined>(props.directory)

  onMount(() => {
    const dir = props.directory
    if (!dir) return
    sdk().client.file
      .list({ path: "" })
      .then((x) => {
        const files = (x.data ?? []).map((f: any) => f.name ?? f.path ?? "")
        setProjectFiles(files)
      })
      .catch((e) => console.error("Failed to list project files", e))
  })

  const detectedFramework = createMemo(() => run.detectProject(projectFiles()))
  const runCommand = createMemo(() => {
    const fw = detectedFramework()
    if (!fw) return undefined
    return run.getRunConfig(fw, projectFiles(), run.selectedTarget())
  })

  const toggle = () => setIsOpen(!isOpen())
  const close = () => setIsOpen(false)

  const handleRun = () => {
    const target = run.selectedTarget()
    const config = runCommand()
    if (config?.command) {
      executeCommand(config.command, { target: target?.id })
    } else if (target) {
      const cmd = generateFallbackCommand(target)
      executeCommand(cmd, { target: target.id })
    } else {
      executeCommand("echo 'No run command configured. Open the dropdown to select a target.'")
    }
  }

  const handleDebug = () => {
    const config = runCommand()
    const target = run.selectedTarget()
    if (config?.debugCommand) {
      executeCommand(config.debugCommand, { debug: true, target: target?.id })
    } else if (target) {
      const cmd = generateFallbackCommand(target, true)
      executeCommand(cmd, { debug: true, target: target.id })
    } else {
      executeCommand("echo 'No debug command configured.'", { debug: true })
    }
  }

  const executeCommand = (cmd: string, options?: { debug?: boolean; target?: string }) => {
    const all = terminal.all()
    const existing = all.length > 0 ? all[all.length - 1] : undefined

    if (existing) {
      terminal.open(existing.id)
      sendTerminalCommand(existing.id, cmd)
      run.startRun(cmd, existing.id, { debug: options?.debug, target: options?.target })
      layout.bottomPanel.open("terminal")
      close()
      return
    }

    terminal.new()
    const waitForTerminal = (attempts = 0) => {
      const current = terminal.all()
      const newTerminal = current[current.length - 1]
      if (newTerminal && newTerminal.id) {
        terminal.open(newTerminal.id)
        sendTerminalCommand(newTerminal.id, cmd)
        run.startRun(cmd, newTerminal.id, { debug: options?.debug, target: options?.target })
        layout.bottomPanel.open("terminal")
        close()
        return
      }
      if (attempts < 20) {
        setTimeout(() => waitForTerminal(attempts + 1), 50)
      }
    }
    waitForTerminal()
  }

  const handleStop = () => {
    const proc = run.activeProcess()
    if (proc) {
      sendTerminalCommand(proc.terminalId, "\u0003")
    }
    run.stopRun()
    close()
  }

  const stateIcon = (): string => {
    switch (run.state()) {
      case "running": return "terminal"
      case "debugging": return "bug"
      case "error": return "close-small"
      case "stopped": return "close-small"
      default: return "play-circle"
    }
  }

  const stateLabel = () => {
    const sel = run.selectedTarget()
    const name = sel?.name ?? ""
    switch (run.state()) {
      case "running": return `Running${name ? ` (${name})` : ""}...`
      case "debugging": return `Debugging${name ? ` (${name})` : ""}`
      case "error": return "Failed"
      case "stopped": return "Stopped"
      default: return name ? `Run: ${name}` : "Run & Debug"
    }
  }

  const platformIcons = createMemo(() => {
    const fw = detectedFramework()
    if (!fw) return []
    const icons: Array<{ icon: string; label: string; color: string }> = []
    if (fw.name === "flutter" || fw.name === "react-native") {
      icons.push({ icon: "desktop", label: "Desktop", color: "text-blue-400" })
      icons.push({ icon: "mobile", label: "Mobile", color: "text-green-400" })
      icons.push({ icon: "window-cursor", label: "Web", color: "text-purple-400" })
    } else if (fw.name === "next" || fw.name === "remix" || fw.name === "vite") {
      icons.push({ icon: "window-cursor", label: "Web", color: "text-purple-400" })
    } else if (fw.name === "electron") {
      icons.push({ icon: "desktop", label: "Desktop", color: "text-blue-400" })
    }
    return icons
  })

  return (
    <div
      class="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div class="flex items-center gap-1">
        {/* Run Button - Icon only, expands on hover */}
        <Button
          variant="ghost"
          class="group relative h-7 px-2 gap-1.5 text-12-medium rounded-l-[10px] rounded-r-none border-0 transition-all duration-200"
          classList={{
            "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.3)]": run.state() === "idle",
            "bg-green-700 hover:bg-green-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]": run.state() === "running",
            "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]": run.state() === "debugging",
            "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]": run.state() === "error",
            "bg-gray-500 hover:bg-gray-400 text-white": run.state() === "stopped",
          }}
          onClick={run.isRunning() ? handleStop : handleRun}
          aria-label={stateLabel()}
        >
          <Show when={run.isRunning()} fallback={<Icon name={stateIcon() as any} size="small" />}>
            <span class="animate-spin size-3.5 border-2 border-white/30 border-t-white rounded-full" />
          </Show>
          <Show when={isHovered()}>
            <span class="text-11-medium whitespace-nowrap">{stateLabel()}</span>
          </Show>
        </Button>

        {/* Debug Button - Icon only */}
        <Button
          variant="ghost"
          class="h-7 px-2 gap-1.5 text-12-medium rounded-none border-0 transition-all duration-200"
          classList={{
            "bg-amber-600 hover:bg-amber-500 text-white": run.state() === "debugging",
            "bg-gray-600 hover:bg-gray-500 text-white": run.state() !== "debugging",
          }}
          onClick={handleDebug}
          aria-label="Debug"
        >
          <Icon name="bug" size="small" />
          <Show when={isHovered()}>
            <span class="text-11-medium whitespace-nowrap">Debug</span>
          </Show>
        </Button>

        {/* Platform Indicators - Compact device icons */}
        <Show when={platformIcons().length > 0}>
          <div class="flex items-center gap-0.5 px-1.5 h-7 rounded-[8px] bg-surface-raised-base/50 border border-border-weaker-base">
            <For each={platformIcons()}>
              {(item) => (
                <div
                  class={`flex items-center justify-center size-5 rounded-[4px] hover:bg-surface-raised-base-hover transition-colors ${item.color}`}
                  title={item.label}
                >
                  <Icon name={item.icon as any} size="small" />
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Dropdown Toggle */}
        <Button
          variant="ghost"
          class="h-7 w-6 px-0 rounded-l-none rounded-r-[10px] border-0 transition-all duration-200"
          classList={{
            "bg-green-600 hover:bg-green-500 text-white": run.state() === "idle",
            "bg-green-700 hover:bg-green-600 text-white": run.state() === "running",
            "bg-amber-600 hover:bg-amber-500 text-white": run.state() === "debugging",
            "bg-red-600 hover:bg-red-500 text-white": run.state() === "error",
            "bg-gray-500 hover:bg-gray-400 text-white": run.state() === "stopped",
          }}
          onClick={toggle}
          aria-label="Run & Debug options"
        >
          <Icon name="chevron-down" size="small" />
        </Button>
      </div>

      {/* Dropdown Panel */}
      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={close} />
        <Card
          class="absolute top-full right-0 mt-1 z-50 w-[420px] max-h-[500px] overflow-hidden shadow-xl border border-border-weak-base rounded-[12px]"
          style={{ "clip-path": "none" }}
        >
          <div class="flex flex-col">
            {/* Header */}
            <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border-weaker-base bg-surface-base/50">
              <Icon name="play-circle" size="small" class="text-green-500" />
              <span class="text-13-semibold text-text-base">Run & Debug</span>
              <div class="flex-1" />
              <Button
                variant="ghost"
                size="small"
                class="text-10-medium text-text-weaker hover:text-text-base"
                onClick={() => run.refreshDevices?.()}
                title="Refresh device list"
              >
                <Icon name="arrow-undo-down" size="small" />
              </Button>
              <Show when={run.isRunning()}>
                <Button
                  variant="ghost"
                  size="small"
                  class="text-red-500 hover:text-red-400 text-11-medium"
                  onClick={handleStop}
                >
                  <Icon name="close-small" size="small" />
                  Stop
                </Button>
              </Show>
            </div>

            {/* Projects Section */}
            <Show when={projects().length > 1}>
              <div class="px-3 py-2 border-b border-border-weaker-base">
                <div class="text-10-medium text-text-weaker uppercase tracking-wider mb-1.5">Projects</div>
                <div class="flex flex-wrap gap-1.5">
                  <For each={projects()}>
                    {(project) => {
                      const dir = project.worktree
                      const isSelected = createMemo(() => selectedProjectDir() === dir || (!selectedProjectDir() && dir === projects()[0]?.worktree))
                      return (
                        <button
                          type="button"
                          class="flex items-center gap-1 rounded-[5px] border px-2 py-1 text-[11px] font-medium transition-all duration-100"
                          classList={{
                            "ring-2 ring-offset-1 ring-offset-transparent opacity-100": isSelected(),
                            "opacity-60 hover:opacity-100": !isSelected(),
                          }}
                          style={isSelected() ? { outline: "2px solid var(--accent-base)", "outline-offset": "1px" } : {}}
                          onClick={() => setSelectedProjectDir(dir)}
                          title={dir}
                        >
                          <ProjectBadge project={project} size="xs" />
                        </button>
                      )
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Framework Detection */}
            <Show when={detectedFramework()}>
              <div class="px-3 py-2 border-b border-border-weaker-base bg-surface-base">
                <div class="flex items-center gap-2">
                  <Icon name={detectedFramework()!.icon as any} size="small" class="text-accent-base" />
                  <span class="text-12-medium text-text-base">{detectedFramework()!.displayName} detected</span>
                  <Show when={run.flutterAvailable()}>
                    <span class="text-10-regular text-green-500">Flutter SDK found</span>
                  </Show>
                </div>
                <Show when={run.flutterProjectInfo().isFlutter}>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <Show when={run.flutterProjectInfo().hasAndroid}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Android</span>
                    </Show>
                    <Show when={run.flutterProjectInfo().hasIos}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">iOS</span>
                    </Show>
                    <Show when={run.flutterProjectInfo().hasWeb}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Web</span>
                    </Show>
                    <Show when={run.flutterProjectInfo().hasLinux}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Linux</span>
                    </Show>
                    <Show when={run.flutterProjectInfo().hasWindows}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">Windows</span>
                    </Show>
                    <Show when={run.flutterProjectInfo().hasMacos}>
                      <span class="text-9-regular px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">macOS</span>
                    </Show>
                  </div>
                </Show>
                <Show when={runCommand()}>
                  <div class="mt-1.5 flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="small"
                      class="text-11-medium text-green-500 hover:text-green-400"
                      onClick={handleRun}
                    >
                      <Icon name="play-circle" size="small" />
                      Run
                    </Button>
                    <Show when={runCommand()!.debugCommand}>
                      <Button
                        variant="ghost"
                        size="small"
                        class="text-11-medium text-amber-500 hover:text-amber-400"
                        onClick={handleDebug}
                      >
                        <Icon name="bug" size="small" />
                        Debug
                      </Button>
                    </Show>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Tabs */}
            <div class="flex border-b border-border-weaker-base">
              <For
                each={[
                  { id: "targets" as const, label: "Targets", icon: "terminal" },
                  { id: "configs" as const, label: "Configs", icon: "settings-gear" },
                  { id: "recent" as const, label: "Recent", icon: "scroll-text" },
                ]}
              >
                {(tab) => (
                  <button
                    class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-11-medium transition-colors"
                    classList={{
                      "text-text-base border-b-2 border-accent-base bg-surface-base": isOpen() && tab.id === "targets",
                      "text-text-weak hover:text-text-base": true,
                    }}
                    onClick={() => {}}
                  >
                    <Icon name={tab.icon as any} size="small" />
                    {tab.label}
                  </button>
                )}
              </For>
            </div>

            {/* Content */}
            <div class="max-h-[300px] overflow-auto">
              <TargetsSection
                selectedTargetId={run.lastSelectedTargetId()}
                onSelect={(target) => {
                  run.selectTarget(target.id)
                  executeCommand(runCommand()?.command ?? `echo 'Run on ${target.name}'`, { target: target.id })
                }}
              />
            </div>
          </div>
        </Card>
      </Show>
    </div>
  )
}

function TargetsSection(props: {
  selectedTargetId?: string
  onSelect: (target: { id: string; name: string }) => void
}) {
  const run = useRunService()
  const categories = run.targetsByCategory

  const targetLabel = (target: any) => {
    const status = target.available ? "Available" : "Unavailable"
    return `${target.name} (${status})`
  }

  return (
    <div class="p-2">
      <For each={Object.entries(categories())}>
        {([category, targets]) => (
          <div class="mb-2">
            <div class="text-10-medium text-text-weaker uppercase tracking-wider px-1 mb-1">{category}</div>
            <For each={targets}>
              {(target) => {
                const isSelected = () => target.id === props.selectedTargetId
                return (
                  <button
                    class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-background-hover text-left transition-colors"
                    classList={{
                      "bg-background-hover": isSelected(),
                      "opacity-40 cursor-not-allowed pointer-events-none": !target.available,
                    }}
                    disabled={!target.available}
                    onClick={() => props.onSelect(target)}
                  >
                    <Show
                      when={isSelected()}
                      fallback={<Icon name={target.icon as any} size="small" class="text-text-weak" />}
                    >
                      <Icon name="check-small" size="small" class="text-green-500" />
                    </Show>
                    <span class="text-12-regular text-text-base flex-1">{targetLabel(target)}</span>
                    <Show when={!target.available}>
                      <span class="text-10-regular text-amber-500">Disabled</span>
                    </Show>
                    <Show when={target.isEmulator || target.isSimulator}>
                      <span class="text-10-regular text-blue-500">Virtual</span>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
