import { For, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { makeEventListener } from "@solid-primitives/event-listener"
import { Tabs } from "@mindsparq-ai/ui/tabs"
import { ResizeHandle } from "@mindsparq-ai/ui/resize-handle"
import { IconButton } from "@mindsparq-ai/ui/icon-button"
import { TooltipKeybind } from "@mindsparq-ai/ui/tooltip"
import { Icon } from "@mindsparq-ai/ui/icon"

import { useLayout, type BottomPanelTab } from "@/context/layout"
import { useCommand } from "@/context/command"
import { useLanguage } from "@/context/language"
import { createSizing } from "@/pages/session/helpers"

import { TerminalPanel } from "@/pages/session/terminal-panel"
import { ProblemsPanel } from "@/pages/session/bottom-panel/problems-panel"
import { OutputPanel } from "@/pages/session/bottom-panel/output-panel"
import { DebugConsolePanel } from "@/pages/session/bottom-panel/debug-console-panel"
import { PortsPanel } from "@/pages/session/bottom-panel/ports-panel"

const PANEL_TABS = [
  { id: "terminal" as BottomPanelTab, label: "Terminal", icon: "terminal", keybind: "terminal.toggle" },
  { id: "problems" as BottomPanelTab, label: "Problems", icon: "bug", keybind: "bottomPanel.problems" },
  { id: "output" as BottomPanelTab, label: "Output", icon: "scroll-text", keybind: "bottomPanel.output" },
  { id: "debug" as BottomPanelTab, label: "Debug Console", icon: "play-circle", keybind: "bottomPanel.debug" },
  { id: "ports" as BottomPanelTab, label: "Ports", icon: "network", keybind: "bottomPanel.ports" },
]

export function BottomPanel() {
  const layout = useLayout()
  const command = useCommand()
  const language = useLanguage()

  const opened = layout.bottomPanel.opened
  const activeTab = layout.bottomPanel.activeTab
  const height = layout.bottomPanel.height
  const size = createSizing()

  const [store, setStore] = createStore({
    viewportHeight: typeof window === "undefined" ? 1000 : (window.visualViewport?.height ?? window.innerHeight),
  })

  const max = () => store.viewportHeight * 0.6
  const pane = () => Math.min(height(), max())

  onMount(() => {
    if (typeof window === "undefined") return
    const sync = () => setStore("viewportHeight", window.visualViewport?.height ?? window.innerHeight)
    const port = window.visualViewport
    sync()
    makeEventListener(window, "resize", sync)
    if (port) makeEventListener(port, "resize", sync)
  })

  return (
    <div
      id="bottom-panel"
      role="region"
      aria-label="Bottom Panel"
      aria-hidden={!opened()}
      inert={!opened()}
      class="relative w-full shrink-0 bg-background-stronger"
      classList={{
        "transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[height] motion-reduce:transition-none":
          !size.active(),
      }}
      style={{ height: opened() ? `${pane()}px` : "0px" }}
    >
      <div class="hidden md:block" onPointerDown={() => size.start()}>
        <ResizeHandle
          direction="vertical"
          size={pane()}
          min={100}
          max={max()}
          collapseThreshold={50}
          onResize={(next) => {
            size.touch()
            layout.bottomPanel.resize(next)
          }}
          onCollapse={() => layout.bottomPanel.close()}
        />
      </div>
      <div
        class="absolute inset-x-0 top-0 flex flex-col overflow-hidden"
        classList={{
          "border-t border-border-weak-base": opened(),
          "pointer-events-none": !opened(),
        }}
        style={{ height: `${pane()}px` }}
      >
        <div class="flex flex-col h-full">
          <Tabs
            variant="alt"
            value={activeTab()}
            onChange={(tab) => layout.bottomPanel.setActiveTab(tab as BottomPanelTab)}
            class="!h-auto !flex-none"
          >
            <Tabs.List class="h-9 border-b border-border-weaker-base flex items-center">
              <For each={PANEL_TABS}>
                {(tab) => (
                  <Tabs.Trigger value={tab.id} class="!border-0 !border-b-2 !border-b-transparent data-[selected]:!border-b-accent-base">
                    <div class="flex items-center gap-1.5 px-2 py-1">
                      <Icon name={tab.icon as any} size="small" />
                      <span class="text-12-medium">{tab.label}</span>
                    </div>
                  </Tabs.Trigger>
                )}
              </For>
              <div class="flex-1" />
              <div class="flex items-center gap-0.5 pr-2">
                <TooltipKeybind
                  title="New Terminal"
                  keybind={command.keybind("terminal.new")}
                  class="flex items-center"
                >
                  <IconButton
                    icon="plus-small"
                    variant="ghost"
                    iconSize="small"
                    onClick={() => layout.bottomPanel.open("terminal")}
                    aria-label="New Terminal"
                  />
                </TooltipKeybind>
                <IconButton
                  icon="close"
                  variant="ghost"
                  iconSize="small"
                  onClick={() => layout.bottomPanel.close()}
                  aria-label="Close panel"
                />
              </div>
            </Tabs.List>
          </Tabs>
          <div class="flex-1 min-h-0 relative">
            <div class="absolute inset-0" classList={{ hidden: activeTab() !== "terminal" }}>
              <TerminalPanel embedded />
            </div>
            <div class="absolute inset-0" classList={{ hidden: activeTab() !== "problems" }}>
              <ProblemsPanel />
            </div>
            <div class="absolute inset-0" classList={{ hidden: activeTab() !== "output" }}>
              <OutputPanel />
            </div>
            <div class="absolute inset-0" classList={{ hidden: activeTab() !== "debug" }}>
              <DebugConsolePanel />
            </div>
            <div class="absolute inset-0" classList={{ hidden: activeTab() !== "ports" }}>
              <PortsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
