import { createSignal, Show, createMemo } from "solid-js"
import { Button } from "@mindsparq-ai/ui/button"
import { Card } from "@mindsparq-ai/ui/card"
import { IconButton } from "@mindsparq-ai/ui/icon-button"
import { Tooltip } from "@mindsparq-ai/ui/tooltip"
import { sendTerminalCommand, useTerminal } from "@/context/terminal"
import { useLanguage } from "@/context/language"
import { detectProjectLanguage } from "@/utils/filetype"
import { getRunConfig, detectEntryFile, hasBuildFile } from "@/utils/run-config"

type RunPanelProps = {
  directory: string
  files: string[]
  onRun?: (command: string) => void
}

export function RunPanel(props: RunPanelProps) {
  const terminal = useTerminal()
  const language = useLanguage()

  const [isFullscreen, setIsFullscreen] = createSignal(false)
  const [isRunning, setIsRunning] = createSignal(false)

  const detectedLanguage = createMemo(() => detectProjectLanguage(props.files))
  const runConfig = createMemo(() => getRunConfig(detectedLanguage()))
  const entryFile = createMemo(() => detectEntryFile(props.files, detectedLanguage()))
  const hasBuild = createMemo(() => hasBuildFile(props.files, detectedLanguage()))

  const runCommand = createMemo(() => {
    const config = runConfig()
    if (!config) return undefined
    const entry = entryFile()
    if (entry) {
      return `${config.command} ${entry}`
    }
    return config.command
  })

  const debugCommand = createMemo(() => {
    const config = runConfig()
    if (!config?.debugCommand) return undefined
    const entry = entryFile()
    if (entry) {
      return `${config.debugCommand} ${entry}`
    }
    return config.debugCommand
  })

  async function executeRun(command: string) {
    setIsRunning(true)
    const id = await terminal.new()
    if (id) {
      sendTerminalCommand(id, command)
    }
    props.onRun?.(command)
  }

  function handleRun() {
    const cmd = runCommand()
    if (cmd) executeRun(cmd)
  }

  function handleDebug() {
    const cmd = debugCommand()
    if (cmd) executeRun(cmd)
  }

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen())
  }

  return (
    <div
      data-component="run-panel"
      class="flex flex-col"
      classList={{
        "fixed inset-0 z-[9998] bg-background-base": isFullscreen(),
        "border-t border-border-base": !isFullscreen(),
      }}
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base">
        <div class="flex items-center gap-2">
          <Show
            when={runConfig()}
            fallback={
              <span class="text-13-medium text-text-weak">
                {language.t("run_panel.noLanguageDetected")}
              </span>
            }
          >
            <div class="flex items-center gap-1.5">
              <span class="text-13-medium text-text-base">
                {runConfig()?.label}
              </span>
              <Show when={entryFile()}>
                <span class="text-11-regular text-text-weak">
                  {entryFile()}
                </span>
              </Show>
              <Show when={hasBuild()}>
                <span class="text-11-regular text-green-500">
                  {language.t("run_panel.buildReady")}
                </span>
              </Show>
            </div>
          </Show>
        </div>

        <div class="flex items-center gap-1">
          <Show when={runConfig()}>
            <Tooltip value={language.t("run_panel.runTooltip")}>
              <Button
                variant="secondary"
                size="small"
                onClick={handleRun}
                disabled={!runCommand() || isRunning()}
                class="gap-1.5"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {language.t("run_panel.run")}
              </Button>
            </Tooltip>

            <Show when={debugCommand()}>
              <Tooltip value={language.t("run_panel.debugTooltip")}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleDebug}
                  disabled={isRunning()}
                  class="gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {language.t("run_panel.debug")}
                </Button>
              </Tooltip>
            </Show>
          </Show>

          <Show when={isFullscreen()}>
            <Tooltip value={language.t("run_panel.exitFullscreen")}>
              <IconButton icon="expand" onClick={toggleFullscreen} size="small" />
            </Tooltip>
          </Show>

          <Show when={!isFullscreen()}>
            <Tooltip value={language.t("run_panel.fullscreen")}>
              <IconButton icon="expand" onClick={toggleFullscreen} size="small" />
            </Tooltip>
          </Show>
        </div>
      </div>

      <Show when={!runConfig()}>
        <div class="flex-1 flex items-center justify-center p-6">
          <Card variant="info" class="max-w-sm">
            <p class="text-13-regular text-text-weak text-center">
              {language.t("run_panel.unsupportedLanguage")}
            </p>
            <p class="text-12-regular text-text-weak text-center mt-1">
              {language.t("run_panel.unsupportedHint")}
            </p>
          </Card>
        </div>
      </Show>
    </div>
  )
}
