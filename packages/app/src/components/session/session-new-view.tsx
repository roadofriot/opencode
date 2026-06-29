import { Show, For, createMemo } from "solid-js"
import { DateTime } from "luxon"
import { useSync } from "@/context/sync"
import { useSDK } from "@/context/sdk"
import { useLanguage } from "@/context/language"
import { usePrompt } from "@/context/prompt"
import { Icon } from "@mindsparq-ai/ui/icon"
import { Mark } from "@mindsparq-ai/ui/logo"
import { getDirectory, getFilename } from "@mindsparq-ai/core/util/path"

const MAIN_WORKTREE = "main"
const CREATE_WORKTREE = "create"
const ROOT_CLASS = "size-full flex flex-col"

interface NewSessionViewProps {
  worktree: string
}

export function NewSessionView(props: NewSessionViewProps) {
  const sync = useSync()
  const sdk = useSDK()
  const language = useLanguage()
  const prompt = usePrompt()

  const sandboxes = createMemo(() => sync().project?.sandboxes ?? [])
  const options = createMemo(() => [MAIN_WORKTREE, ...sandboxes(), CREATE_WORKTREE])
  const current = createMemo(() => {
    const selection = props.worktree
    if (options().includes(selection)) return selection
    return MAIN_WORKTREE
  })
  const projectRoot = createMemo(() => sync().project?.worktree ?? sdk().directory)
  const isWorktree = createMemo(() => {
    const project = sync().project
    if (!project) return false
    return sdk().directory !== project.worktree
  })

  const label = (value: string) => {
    if (value === MAIN_WORKTREE) {
      if (isWorktree()) return language.t("session.new.worktree.main")
      const branch = sync().data.vcs?.branch
      if (branch) return language.t("session.new.worktree.mainWithBranch", { branch })
      return language.t("session.new.worktree.main")
    }

    if (value === CREATE_WORKTREE) return language.t("session.new.worktree.create")

    return getFilename(value)
  }

  const suggestedPrompts = [
    language.t("session.new.suggest.explainCode") || "Explain this code",
    language.t("session.new.suggest.fixBugs") || "Fix bugs",
    language.t("session.new.suggest.generateTests") || "Generate tests",
  ]

  const handleSelectPrompt = (promptText: string) => {
    prompt.set([{ type: "text", content: promptText, start: 0, end: promptText.length }])
  }

  return (
    <div class={ROOT_CLASS}>
      <div class="h-12 shrink-0" aria-hidden />
      <div class="flex-1 px-6 pb-30 flex items-center justify-center text-center">
        <div class="w-full max-w-200 flex flex-col items-center text-center gap-8">
          
          {/* Welcome Card Container */}
          <div class="relative w-full p-8 rounded-2xl border border-border-weaker-base bg-v2-background-bg-layer-01/40 backdrop-blur-md shadow-2xl flex flex-col items-center gap-6 overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-tr from-accent-base/5 via-transparent to-transparent opacity-40 pointer-events-none" />
            
            <div class="relative">
              <Mark class="w-16 h-16 opacity-30 text-accent-base" />
              <div class="absolute inset-0 blur-3xl bg-accent-base/10 rounded-full" />
            </div>

            <div class="flex flex-col items-center gap-2">
              <div class="text-24-semibold text-text-strong tracking-tight">
                {language.t("session.new.title") || "Welcome to MindSparQ AI"}
              </div>
              <div class="text-13-regular text-text-weak max-w-[340px] leading-relaxed">
                {language.t("session.new.subtitle") || "Start a conversation or ask anything. I can help with code, debugging, and more."}
              </div>
            </div>

            {/* Path metadata pill */}
            <div class="flex flex-col gap-2 items-center bg-v2-background-bg-layer-02/50 border border-border-weaker-base/60 rounded-xl px-4 py-3 min-w-[280px]">
              <div class="flex items-center justify-center gap-1.5 text-11-medium text-text-weak">
                <span>{getDirectory(projectRoot())}</span>
                <span class="text-text-strong font-semibold">{getFilename(projectRoot())}</span>
              </div>
              <div class="flex items-center justify-center gap-1.5 text-11-medium text-text-weak">
                <Icon name="branch" size="small" class="shrink-0 text-accent-base" />
                <span>{label(current())}</span>
              </div>
              <Show when={sync().project}>
                {(project) => (
                  <div class="text-[10px] text-text-weaker mt-0.5">
                    {language.t("session.new.lastModified")}:{" "}
                    <span class="font-medium text-text-weak">
                      {DateTime.fromMillis(project().time.updated ?? project().time.created)
                        .setLocale(language.intl())
                        .toRelative()}
                    </span>
                  </div>
                )}
              </Show>
            </div>
          </div>

          {/* Suggested Prompts Section */}
          <Show when={suggestedPrompts.length > 0}>
            <div class="flex flex-col items-center gap-3">
              <span class="text-11-medium text-text-weaker uppercase tracking-wider">Suggested Prompts</span>
              <div class="flex flex-wrap justify-center gap-2.5">
                <For each={suggestedPrompts}>
                  {(promptText) => (
                    <button
                      type="button"
                      class="px-4 py-2 rounded-xl text-12-medium text-text-weak border border-border-weaker-base
                             bg-v2-background-bg-layer-01/30 backdrop-blur-sm cursor-pointer transition-all duration-200
                             hover:border-accent-base/50 hover:text-text-strong hover:bg-v2-background-bg-layer-02/60
                             active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-accent-base/30"
                      onClick={() => handleSelectPrompt(promptText)}
                    >
                      {promptText}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </div>
  )
}
