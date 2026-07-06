import { Icon } from "@mindsparq-ai/ui/v2/icon"
import { createSignal, Show, onMount, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

export function HelpButton() {
  const [state, setState] = createStore({ dismissed: false })
  const [expanded, setExpanded] = createSignal(false)
  const [position, setPosition] = createSignal<{ x: number; y: number } | undefined>(undefined)

  let containerRef!: HTMLDivElement

  onMount(() => {
    const storedX = localStorage.getItem("mindsparq:help-button-x")
    const storedY = localStorage.getItem("mindsparq:help-button-y")
    if (storedX !== null && storedY !== null) {
      setPosition({ x: parseFloat(storedX), y: parseFloat(storedY) })
    }
  })

  const handleMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
      return
    }

    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY

    const rect = containerRef.getBoundingClientRect()
    const initialX = rect.left
    const initialY = rect.top

    let hasMoved = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      if (!hasMoved && Math.hypot(deltaX, deltaY) > 4) {
        hasMoved = true
      }

      if (hasMoved) {
        let newLeft = initialX + deltaX
        let newTop = initialY + deltaY

        newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - rect.width - 8))
        newTop = Math.max(8, Math.min(newTop, window.innerHeight - rect.height - 8))

        setPosition({ x: newLeft, y: newTop })
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)

      if (hasMoved && position()) {
        localStorage.setItem("mindsparq:help-button-x", position()!.x.toString())
        localStorage.setItem("mindsparq:help-button-y", position()!.y.toString())
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleTouchStart = (e: TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return
    }

    const touch = e.touches[0]
    if (!touch) return

    const startX = touch.clientX
    const startY = touch.clientY

    const rect = containerRef.getBoundingClientRect()
    const initialX = rect.left
    const initialY = rect.top

    let hasMoved = false

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0]
      if (!moveTouch) return

      const deltaX = moveTouch.clientX - startX
      const deltaY = moveTouch.clientY - startY

      if (!hasMoved && Math.hypot(deltaX, deltaY) > 4) {
        hasMoved = true
      }

      if (hasMoved) {
        let newLeft = initialX + deltaX
        let newTop = initialY + deltaY

        newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - rect.width - 8))
        newTop = Math.max(8, Math.min(newTop, window.innerHeight - rect.height - 8))

        setPosition({ x: newLeft, y: newTop })
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)

      if (hasMoved && position()) {
        localStorage.setItem("mindsparq:help-button-x", position()!.x.toString())
        localStorage.setItem("mindsparq:help-button-y", position()!.y.toString())
      }
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd)
  }

  const style = () => {
    const pos = position()
    if (!pos) return {}
    return {
      position: "fixed" as const,
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      bottom: "auto",
      right: "auto",
    }
  }

  return (
    <Show when={!state.dismissed}>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={style()}
        class="fixed z-50 flex flex-col items-end gap-2 cursor-grab active:cursor-grabbing select-none"
        classList={{
          "bottom-4 right-4": !position(),
        }}
      >
        {/* Help Panel */}
        <Show when={expanded()}>
          <div
            class="w-[320px] max-w-[calc(100vw-40px)] p-4 rounded-xl bg-background-strong shadow-[var(--shadow-lg-border-base)] border border-border-weak-base flex flex-col gap-2 transition-all duration-200 cursor-default"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between pb-1 border-b border-border-weak-base">
              <span class="text-14-medium text-text-strong select-text">MindSparQ AI Help & Tips</span>
              <button
                type="button"
                aria-label="Close"
                class="size-5 rounded flex items-center justify-center text-text-base hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(false)
                }}
              >
                <Icon name="xmark-small" />
              </button>
            </div>

            <div class="flex flex-col gap-2 text-12-regular text-text-weak select-text">
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
              <span>Click button to close</span>
              <button
                type="button"
                class="hover:text-text-strong transition-colors cursor-pointer"
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
          class="size-8 rounded-full bg-background-base shadow-[var(--shadow-lg-border-base)] border border-border-weak-base flex items-center justify-center text-14-medium text-text-base hover:text-text-strong hover:bg-surface-raised-base-hover transition-all duration-200 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded())
          }}
        >
          <Show when={expanded()} fallback={<span>?</span>}>
            <Icon name="xmark-small" />
          </Show>
        </button>
      </div>
    </Show>
  )
}
