import { Icon } from "@opencode-ai/ui/v2/icon"
import { createSignal, Show } from "solid-js"
import { createStore } from "solid-js/store"

export function HelpButton() {
  if (import.meta.env.VITE_OPENCODE_CHANNEL !== "dev") return null

  const [state, setState] = createStore({ dismissed: false })
  const [expanded, setExpanded] = createSignal(false)

  return (
    <Show when={!state.dismissed}>
      <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Help Panel */}
        <Show when={expanded()}>
          <div
            class="w-[320px] max-w-[calc(100vw-40px)] p-4 rounded-xl bg-background-strong shadow-[var(--shadow-lg-border-base)] border border-border-weak-base flex flex-col gap-2 transition-all duration-200 cursor-pointer"
            onClick={() => setExpanded(false)}
          >
            <div class="flex items-center justify-between pb-1 border-b border-border-weak-base">
              <span class="text-14-medium text-text-strong">OpenCode Help & Tips</span>
              <button
                type="button"
                aria-label="Close"
                class="size-5 rounded flex items-center justify-center text-text-base hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(false)
                }}
              >
                <Icon name="xmark-small" />
              </button>
            </div>

            <div class="flex flex-col gap-2 text-12-regular text-text-weak">
              <p>
                • <strong>Tab</strong>: Toggle between <strong>Build</strong> and <strong>Plan</strong> agents.
              </p>
              <p>
                • <strong>Ctrl + P</strong> (Cmd+P): Search and open files.
              </p>
              <p>
                • <strong>Voice Input</strong>: Click microphone to dictate. Local Whisper runs completely offline once cached.
              </p>
              <p>
                • <strong>Settings</strong>: Configure Whisper model size & language in <strong>Settings → AI Features</strong>.
              </p>
            </div>

            <div class="flex justify-between items-center mt-2 pt-2 border-t border-border-weak-base text-[10px] text-text-faint">
              <span>Click panel to close</span>
              <button
                type="button"
                class="hover:text-text-strong transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(false)
                  setState("dismissed", true)
                }}
              >
                Hide permanently
              </button>
            </div>
          </div>
        </Show>

        {/* Toggle Button "?" */}
        <button
          type="button"
          aria-label={expanded() ? "Close Help" : "Open Help"}
          class="size-8 rounded-full bg-background-base shadow-[var(--shadow-lg-border-base)] border border-border-weak-base flex items-center justify-center text-14-medium text-text-base hover:text-text-strong hover:bg-surface-raised-base-hover transition-all duration-200"
          onClick={() => setExpanded(!expanded())}
        >
          <Show when={expanded()} fallback={<span>?</span>}>
            <Icon name="xmark-small" />
          </Show>
        </button>
      </div>
    </Show>
  )
}
