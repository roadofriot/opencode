import { type Component, For, Show, createSignal, onMount, onCleanup } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Select } from "@opencode-ai/ui/select"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useSettings } from "@/context/settings"
import { WhisperTranscriber } from "@/utils/whisper-transcriber"
import { SettingsList } from "./settings-list"

type FeatureCard = {
  icon: string
  title: string
  description: string
  badge?: string
  actions: { label: string; icon: string; action: () => void }[]
}

export const SettingsAIFeatures: Component = () => {
  const dialog = useDialog()
  const settings = useSettings()

  const [downloading, setDownloading] = createSignal(false)
  const [loaded, setLoaded] = createSignal(false)
  const [activeFile, setActiveFile] = createSignal("")
  const [activeProgress, setActiveProgress] = createSignal(0)

  onMount(() => {
    const unsubscribe = WhisperTranscriber.subscribeProgress((progress) => {
      if (progress.status === "initiate") {
        setActiveFile(progress.file)
        setActiveProgress(0)
        setDownloading(true)
      } else if (progress.status === "downloading") {
        setActiveFile(progress.file)
        setActiveProgress(Math.round(progress.progress))
        setDownloading(true)
      } else if (progress.status === "done") {
        setActiveProgress(100)
        setDownloading(false)
        setLoaded(true)
      }
    })
    onCleanup(unsubscribe)
  })

  const downloadModel = async () => {
    setDownloading(true)
    try {
      await WhisperTranscriber.preloadModel(settings.voice.model())
      setLoaded(true)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  const openServers = () => {
    void import("./dialog-select-server").then((x) => {
      dialog.show(() => <x.DialogSelectServer />)
    })
  }

  const features: FeatureCard[] = [
    {
      icon: "brain",
      title: "Multi-Agent Loop Engineering",
      badge: "Advanced",
      description:
        "OpenCode supports running multiple specialized agents in parallel. Use the agent selector in the chat prompt bar to switch between \"build\", \"research\", and custom agent modes. Agents can be chained through tool calls and MCP servers to create complex automated workflows.",
      actions: [
        {
          label: "Open Agent Selector",
          icon: "arrow-up",
          action: () => dialog.close(),
        },
      ],
    },
    {
      icon: "server",
      title: "MCP Servers (Model Context Protocol)",
      badge: "Anthropic / Claude",
      description:
        "Model Context Protocol (MCP) servers extend what AI agents can do — giving them access to databases, APIs, files, and external tools. Connect your own MCP server or use community servers to unlock capabilities like web browsing, code execution, memory, and more. Supported by Anthropic Claude, OpenAI, and other providers.",
      actions: [
        {
          label: "Manage MCP Servers",
          icon: "server",
          action: openServers,
        },
      ],
    },
    {
      icon: "brain",
      title: "Anthropic Claude Skills",
      badge: "Claude",
      description:
        "Claude Skills let you define reusable, parameterized capabilities that Claude can invoke across conversations. Skills are defined as structured prompts with typed inputs and can call tools, perform web searches, read files, or chain other agents. Configure them in your OpenCode config file under the `skills` section.",
      actions: [
        {
          label: "Claude Skills Docs",
          icon: "arrow-up-right",
          action: () => {
            window.open("https://docs.anthropic.com/en/docs/build-with-claude/tool-use", "_blank")
          },
        },
      ],
    },
    {
      icon: "microphone",
      title: "Voice to Text",
      badge: "Built-in",
      description:
        "Configure speech transcription settings. Use standard cloud recognition or load a local multilingual Whisper model that operates completely offline.",
      actions: [],
    },
    {
      icon: "server",
      title: "Groq, xAI (Grok), OpenRouter & More",
      badge: "Multi-Provider",
      description:
        "OpenCode connects to any OpenAI-compatible provider. In Settings → Providers, you can add API keys for Anthropic Claude, Google Gemini, Groq (ultra-fast LLaMA), OpenRouter (multi-model gateway), xAI Grok, and many more. Each provider has its own API key format which is validated before saving.",
      actions: [
        {
          label: "Manage Providers",
          icon: "providers",
          action: () => dialog.close(),
        },
      ],
    },
  ]

  return (
    <div class="flex flex-col h-full overflow-y-auto px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8">
          <h2 class="text-16-medium text-text-strong">AI Features</h2>
          <p class="text-12-regular text-text-weak">
            Explore advanced capabilities: multi-agent loops, MCP servers, voice input, and more.
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-6 max-w-[720px]">
        <SettingsList>
          <For each={features}>
            {(feature) => (
              <div class="flex flex-col gap-3 py-5 border-b border-border-weak-base last:border-none">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 mt-0.5 size-8 rounded-lg bg-surface-raised-stronger-non-alpha flex items-center justify-center">
                    <Icon name={feature.icon as Parameters<typeof Icon>[0]["name"]} size="small" class="text-icon-strong-base" />
                  </div>
                  <div class="flex flex-col gap-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-14-medium text-text-strong">{feature.title}</span>
                      {feature.badge && (
                        <span class="text-11-medium px-1.5 py-0.5 rounded bg-surface-raised-stronger-non-alpha text-text-weak border border-border-weak-base">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p class="text-12-regular text-text-weak leading-relaxed">{feature.description}</p>
                    
                    <Show when={feature.title === "Voice to Text"}>
                      <div class="flex flex-col gap-4 mt-4 p-4 rounded-xl border border-border-weak-base bg-surface-raised-stronger-non-alpha max-w-lg">
                        <div class="flex items-center justify-between gap-4">
                          <span class="text-12-medium text-text-strong">Speech Engine</span>
                          <Select
                            options={[
                              { value: "cloud", label: "Cloud (Web Speech API)" },
                              { value: "local", label: "Local Whisper (ONNX)" },
                            ]}
                            current={[
                              { value: "cloud", label: "Cloud (Web Speech API)" },
                              { value: "local", label: "Local Whisper (ONNX)" },
                            ].find((o) => o.value === settings.voice.engine())}
                            value={(o) => o.value}
                            label={(o) => o.label}
                            onSelect={(option) => option && settings.voice.setEngine(option.value as any)}
                            variant="secondary"
                            size="small"
                            triggerVariant="settings"
                          />
                        </div>

                        <Show when={settings.voice.engine() === "local"}>
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-12-medium text-text-strong">Model Size</span>
                            <Select
                              options={[
                                { value: "Xenova/whisper-tiny", label: "Tiny (~75 MB)" },
                                { value: "Xenova/whisper-base", label: "Base (~140 MB)" },
                              ]}
                              current={[
                                { value: "Xenova/whisper-tiny", label: "Tiny (~75 MB)" },
                                { value: "Xenova/whisper-base", label: "Base (~140 MB)" },
                              ].find((o) => o.value === settings.voice.model())}
                              value={(o) => o.value}
                              label={(o) => o.label}
                              onSelect={(option) => option && settings.voice.setModel(option.value)}
                              variant="secondary"
                              size="small"
                              triggerVariant="settings"
                            />
                          </div>

                          <div class="flex items-center justify-between gap-4">
                            <span class="text-12-medium text-text-strong">Language Mode</span>
                            <Select
                              options={[
                                { value: "auto", label: "Auto-Detect Language" },
                                { value: "en", label: "English Only" },
                                { value: "ne", label: "Nepali Only" },
                                { value: "hi", label: "Hindi Only" },
                                { value: "es", label: "Spanish Only" },
                                { value: "fr", label: "French Only" },
                                { value: "de", label: "German Only" },
                                { value: "ja", label: "Japanese Only" },
                                { value: "zh", label: "Chinese Only" },
                              ]}
                              current={[
                                { value: "auto", label: "Auto-Detect Language" },
                                { value: "en", label: "English Only" },
                                { value: "ne", label: "Nepali Only" },
                                { value: "hi", label: "Hindi Only" },
                                { value: "es", label: "Spanish Only" },
                                { value: "fr", label: "French Only" },
                                { value: "de", label: "German Only" },
                                { value: "ja", label: "Japanese Only" },
                                { value: "zh", label: "Chinese Only" },
                              ].find((o) => o.value === settings.voice.language())}
                              value={(o) => o.value}
                              label={(o) => o.label}
                              onSelect={(option) => option && settings.voice.setLanguage(option.value)}
                              variant="secondary"
                              size="small"
                              triggerVariant="settings"
                            />
                          </div>

                          <div class="flex flex-col gap-2 pt-2 border-t border-border-weak-base">
                            <div class="flex items-center justify-between">
                              <span class="text-12-regular text-text-weak">
                                {downloading()
                                  ? `Downloading ${activeFile().split("/").pop()}...`
                                  : loaded()
                                    ? "Model loaded & cached (Offline ready)"
                                    : "Model needs to be cached for offline use"}
                              </span>
                              <Show when={!loaded() && !downloading()}>
                                <Button size="small" variant="primary" onClick={downloadModel}>
                                  Download Model
                                </Button>
                              </Show>
                            </div>

                            <Show when={downloading()}>
                              <div class="w-full bg-surface-raised-stronger-non-alpha rounded-full h-1.5 overflow-hidden">
                                <div
                                  class="bg-accent h-full transition-all duration-300"
                                  style={{ width: `${activeProgress()}%` }}
                                />
                              </div>
                              <span class="text-[10px] text-text-weak self-end">{activeProgress()}%</span>
                            </Show>
                          </div>
                        </Show>
                      </div>
                    </Show>

                    {feature.actions.length > 0 && (
                      <div class="flex items-center gap-2 mt-1">
                        <For each={feature.actions}>
                          {(action) => (
                            <Button
                              size="small"
                              variant="secondary"
                              icon={action.icon as Parameters<typeof Button>[0]["icon"]}
                              onClick={action.action}
                            >
                              {action.label}
                            </Button>
                          )}
                        </For>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </For>
        </SettingsList>

        <div class="rounded-xl border border-border-weak-base bg-surface-raised-stronger-non-alpha p-5 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Icon name="help" size="small" class="text-icon-strong-base" />
            <span class="text-14-medium text-text-strong">Quick Tips</span>
          </div>
          <ul class="flex flex-col gap-2 text-12-regular text-text-weak list-none">
            <li class="flex items-start gap-2">
              <span class="text-text-base mt-0.5">•</span>
              <span>Press the <strong class="text-text-strong">microphone</strong> button in any chat input to activate voice-to-text transcription.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-text-base mt-0.5">•</span>
              <span>Use the <strong class="text-text-strong">agent selector</strong> in the prompt bar to switch between specialized AI agents.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-text-base mt-0.5">•</span>
              <span>Add MCP servers in <strong class="text-text-strong">Settings → Servers</strong> to give agents access to external tools and databases.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-text-base mt-0.5">•</span>
              <span>Connect provider API keys in <strong class="text-text-strong">Settings → Providers</strong> for Anthropic, Gemini, Groq, OpenRouter, and more.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
