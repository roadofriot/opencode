import { createSignal, Show, For, createMemo, onMount, createEffect } from "solid-js"
import { Icon } from "@mindsparq-ai/ui/icon"
import { Button } from "@mindsparq-ai/ui/button"
import { Card } from "@mindsparq-ai/ui/card"
import { useRunService, type RunConfiguration, type FrameworkInfo } from "@/context/run-service"
import { useTerminal, sendTerminalCommand } from "@/context/terminal"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useSDK } from "@/context/sdk"
import { ProjectBadge } from "@/components/project-badge"
import { displayName } from "@/pages/layout/helpers"

export interface RunDebugButtonProps {
  directory?: string
}

export function RunDebugButton(props: RunDebugButtonProps) {
  const run = useRunService()
  const terminal = useTerminal()
  const language = useLanguage()
  const layout = useLayout()
  const sdk = useSDK()
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeSection, setActiveSection] = createSignal<"targets" | "configs" | "recent">("targets")
  const [projectFiles, setProjectFiles] = createSignal<string[]>([])
  // Multi-project: track which project is selected for run
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

  const detectedFramework = createMemo(() => {
    return run.detectProject(projectFiles())
  })

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
      // Use the command from runConfig (which includes target-specific flutter command)
      executeCommand(config.command, { target: target?.id })
    } else if (target) {
      executeCommand(`echo 'Run on ${target.name}'`, { target: target.id })
    } else {
      executeCommand("echo 'No run command configured. Open the dropdown to select a target.'")
    }
  }

  const handleDebug = () => {
    const config = runCommand()
    const target = run.selectedTarget()
    if (config?.debugCommand) {
      executeCommand(config.debugCommand, { debug: true, target: target?.id })
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

  const handleSelectConfig = (config: RunConfiguration) => {
    run.setLastConfig(config.id)
    executeCommand(config.command + " " + config.args.join(" "))
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
      case "running":
        return "terminal"
      case "debugging":
        return "bug"
      case "error":
        return "close-small"
      case "stopped":
        return "close-small"
      default:
        return "play-circle"
    }
  }

  const stateLabel = () => {
    const sel = run.selectedTarget()
    const name = sel?.name ?? ""
    switch (run.state()) {
      case "running":
        return `Running${name ? ` (${name})` : ""}...`
      case "debugging":
        return `Debugging${name ? ` (${name})` : ""}`
      case "error":
        return "Failed"
      case "stopped":
        return "Stopped"
      default:
        return name ? `Run: ${name}` : "Run & Debug"
    }
  }

  return (
    <div class="relative">
      <div class="flex items-center">
        <Button
          variant="ghost"
          class="run-debug-button group relative h-7 px-2.5 gap-1.5 text-12-medium rounded-l-[10px] rounded-r-none border-0"
          classList={{
            "bg-green-600 hover:bg-green-500 text-white": run.state() === "idle",
            "bg-green-700 hover:bg-green-600 text-white": run.state() === "running",
            "bg-amber-600 hover:bg-amber-500 text-white": run.state() === "debugging",
            "bg-red-600 hover:bg-red-500 text-white": run.state() === "error",
            "bg-gray-500 hover:bg-gray-400 text-white": run.state() === "stopped",
            "run-glow": run.state() === "running" || run.state() === "debugging",
          }}
          onClick={run.isRunning() ? handleStop : handleRun}
          aria-label={stateLabel()}
        >
          <Show when={run.isRunning()} fallback={<Icon name={stateIcon() as any} size="small" />}>
            <span class="animate-spin size-3.5 border-2 border-white/30 border-t-white rounded-full" />
          </Show>
          <span>{stateLabel()}</span>
        </Button>
        <TargetSelector run={run} onRun={handleRun} />
        <Button
          variant="ghost"
          class="run-debug-dropdown h-7 w-6 px-0 rounded-l-none rounded-r-[10px] border-0"
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

      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={close} />
        <Card
          class="absolute top-full right-0 mt-1 z-50 w-[420px] max-h-[500px] overflow-hidden shadow-xl border border-border-weak-base"
          style={{ "clip-path": "none" }}
        >
          <div class="flex flex-col">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-border-weaker-base">
              <Icon name="play-circle" size="small" class="text-green-500" />
              <span class="text-13-semibold text-text-base">Run & Debug</span>
              <div class="flex-1" />
              {/* Manual refresh button — Feature 7 */}
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

            {/* Projects section — Feature 6 */}
            <Show when={projects().length > 1}>
              <div data-component="run-level-2" class="px-3 py-2 border-b border-border-weaker-base">
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
                      "text-text-base border-b-2 border-accent-base bg-surface-base": activeSection() === tab.id,
                      "text-text-weak hover:text-text-base": activeSection() !== tab.id,
                    }}
                    onClick={() => setActiveSection(tab.id)}
                  >
                    <Icon name={tab.icon as any} size="small" />
                    {tab.label}
                  </button>
                )}
              </For>
            </div>

            <div class="max-h-[300px] overflow-auto">
              <Show when={activeSection() === "targets"}>
                <TargetsSection
                  selectedTargetId={run.lastSelectedTargetId()}
                  onSelect={(target) => {
                    run.selectTarget(target.id)
                    executeCommand(runCommand()?.command ?? `echo 'Run on ${target.name}'`, { target: target.id })
                  }}
                />
              </Show>
              <Show when={activeSection() === "configs"}>
                <ConfigsSection
                  framework={detectedFramework()}
                  onSave={(config) => {
                    run.saveConfig(config)
                    executeCommand(config.command + " " + config.args.join(" "))
                  }}
                  onSelect={handleSelectConfig}
                />
              </Show>
              <Show when={activeSection() === "recent"}>
                <RecentSection />
              </Show>
            </div>
          </div>
        </Card>
      </Show>
    </div>
  )
}

function TargetSelector(props: { run: ReturnType<typeof useRunService>; onRun: () => void }) {
  const [isOpen, setIsOpen] = createSignal(false)
  const selectedTarget = props.run.selectedTarget()
  const targetsByCategory = props.run.targetsByCategory
  const allTargets = props.run.allTargets()

  const handleSelect = (target: { id: string; name: string }) => {
    props.run.selectTarget(target.id)
    setIsOpen(false)
  }

  const targetLabel = (target: any) => {
    if (target.isEmulator) return `${target.name} (Emulator)`
    if (target.isSimulator) return `${target.name} (Simulator)`
    return target.name
  }

  return (
    <div class="relative">
      <Button
        variant="ghost"
        class="run-target-selector h-7 px-2 gap-1.5 text-11-medium rounded-none border-0 min-w-[140px] justify-start"
        classList={{
          "bg-green-600 hover:bg-green-500 text-white": props.run.state() === "idle",
          "bg-green-700 hover:bg-green-600 text-white": props.run.state() === "running",
          "bg-amber-600 hover:bg-amber-500 text-white": props.run.state() === "debugging",
          "bg-red-600 hover:bg-red-500 text-white": props.run.state() === "error",
          "bg-gray-500 hover:bg-gray-400 text-white": props.run.state() === "stopped",
        }}
        onClick={() => setIsOpen(!isOpen())}
        aria-label="Select target"
      >
        <Icon name={selectedTarget?.icon as any || "terminal"} size="small" />
        <span class="truncate max-w-[100px]">{selectedTarget ? targetLabel(selectedTarget) : "Select Target"}</span>
        <Icon name="chevron-down" size="small" />
      </Button>
      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div class="absolute top-full left-0 mt-1 z-50 w-[220px] max-h-[300px] overflow-auto shadow-xl border border-border-weak-base bg-background-base rounded-md">
          <For each={Object.entries(targetsByCategory())}>
            {([category, targets]) => (
              <div class="p-1">
                <div class="text-10-medium text-text-weaker uppercase tracking-wider px-2 py-1">{category}</div>
                <For each={targets}>
                  {(target) => (
                    <button
                      class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-11-medium hover:bg-background-hover transition-colors"
                      classList={{
                        "bg-background-hover": target.id === selectedTarget?.id,
                        "opacity-50": !target.available,
                      }}
                      onClick={() => handleSelect(target)}
                    >
                      <Show when={target.id === selectedTarget?.id} fallback={<Icon name={target.icon as any} size="small" class="text-text-weak" />}>
                        <Icon name="check-small" size="small" class="text-green-500" />
                      </Show>
                      <span class="truncate flex-1">{targetLabel(target)}</span>
                      <Show when={!target.available}>
                        <span class="text-9-regular text-amber-500">Disabled</span>
                      </Show>
                      <Show when={target.isEmulator || target.isSimulator}>
                        <span class="text-9-regular text-blue-500">Virtual</span>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
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
    if (target.isEmulator) return `${target.name} (Emulator)`
    if (target.isSimulator) return `${target.name} (Simulator)`
    return target.name
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
                      "opacity-50": !target.available,
                    }}
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

function ConfigsSection(props: {
  framework?: FrameworkInfo
  onSave: (config: Omit<RunConfiguration, "id" | "createdAt">) => void
  onSelect: (config: RunConfiguration) => void
}) {
  const run = useRunService()
  const [name, setName] = createSignal("")
  const [command, setCommand] = createSignal("")
  const [showCreate, setShowCreate] = createSignal(false)

  const configs = run.configurations

  return (
    <div class="p-2">
      <div class="flex items-center justify-between px-1 mb-1">
        <span class="text-10-medium text-text-weaker uppercase tracking-wider">Configurations</span>
        <button
          class="text-10-medium text-accent-base hover:text-accent-strong"
          onClick={() => setShowCreate(!showCreate())}
        >
          + New
        </button>
      </div>

      <Show when={showCreate()}>
        <div class="p-2 mb-2 rounded-md bg-surface-base border border-border-weaker-base">
          <input
            type="text"
            placeholder="Configuration name"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class="w-full px-2 py-1 text-12-regular bg-transparent border border-border-weaker-base rounded-md text-text-base placeholder:text-text-weaker focus:outline-none focus:border-accent-base mb-1.5"
          />
          <input
            type="text"
            placeholder="Command"
            value={command()}
            onInput={(e) => setCommand(e.currentTarget.value)}
            class="w-full px-2 py-1 text-12-regular bg-transparent border border-border-weaker-base rounded-md text-text-base placeholder:text-text-weaker focus:outline-none focus:border-accent-base mb-1.5"
          />
          <div class="flex gap-1.5">
            <Button
              variant="ghost"
              size="small"
              class="text-11-medium text-green-500"
              onClick={() => {
                if (name() && command()) {
                  props.onSave({
                    name: name(),
                    command: command(),
                    args: [],
                    env: {},
                    framework: props.framework?.name,
                  })
                  setName("")
                  setCommand("")
                  setShowCreate(false)
                }
              }}
            >
              Save & Run
            </Button>
            <Button
              variant="ghost"
              size="small"
              class="text-11-medium text-text-weak"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Show>

      <Show
        when={configs().length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center py-4">
            No configurations yet. Click "+ New" to create one.
          </div>
        }
      >
        <For each={configs()}>
          {(config) => (
            <button
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-background-hover text-left transition-colors"
              onClick={() => props.onSelect(config)}
            >
              <Icon name="settings-gear" size="small" class="text-text-weak" />
              <div class="flex-1 min-w-0">
                <div class="text-12-medium text-text-base truncate">{config.name}</div>
                <div class="text-10-regular text-text-weaker truncate">{config.command}</div>
              </div>
            </button>
          )}
        </For>
      </Show>
    </div>
  )
}

function RecentSection() {
  const run = useRunService()
  const recent = run.recentTargets()

  return (
    <div class="p-2">
      <div class="text-10-medium text-text-weaker uppercase tracking-wider px-1 mb-1">Recent</div>
      <Show
        when={recent.length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center py-4">
            No recent runs yet.
          </div>
        }
      >
        <For each={recent}>
          {(target) => (
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-md text-12-regular text-text-base">
              <Icon name="terminal" size="small" class="text-text-weak" />
              <span class="truncate">{target}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}
