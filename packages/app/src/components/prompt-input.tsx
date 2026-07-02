import { useFilteredList } from "@mindsparq-ai/ui/hooks"
import { useSpring } from "@mindsparq-ai/ui/motion-spring"
import {
  createEffect,
  on,
  Component,
  splitProps,
  For,
  Show,
  onCleanup,
  createMemo,
  createSignal,
  createResource,
  Switch,
  Match,
  type ComponentProps,
  type JSX,
  onMount,
} from "solid-js"
import { Popover as KobaltePopover } from "@kobalte/core/popover"
import { createStore, type SetStoreFunction, type Store } from "solid-js/store"
import type { useLocal } from "@/context/local"
import { selectionFromLines, type SelectedLineRange, useFile } from "@/context/file"
import {
  ContentPart,
  DEFAULT_PROMPT,
  isPromptEqual,
  Prompt,
  usePrompt,
  ImageAttachmentPart,
  AgentPart,
  FileAttachmentPart,
} from "@/context/prompt"
import { useLayout } from "@/context/layout"
import { useSDK } from "@/context/sdk"
import { useSync } from "@/context/sync"
import { useComments } from "@/context/comments"
import { Button } from "@mindsparq-ai/ui/button"
import { DockShellForm, DockTray } from "@mindsparq-ai/ui/dock-surface"
import { Icon, type IconProps } from "@mindsparq-ai/ui/icon"
import { ProviderIcon } from "@mindsparq-ai/ui/provider-icon"
import { Tooltip, TooltipKeybind } from "@mindsparq-ai/ui/tooltip"
import { IconButton } from "@mindsparq-ai/ui/icon-button"
import { Select } from "@mindsparq-ai/ui/select"
import { useDialog } from "@mindsparq-ai/ui/context/dialog"
import { ModelSelectorPopover } from "@/components/dialog-select-model"
import { useCommand } from "@/context/command"
import { Persist, persisted } from "@/utils/persist"
import { usePermission } from "@/context/permission"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"
import { useSettings } from "@/context/settings"
import { WhisperTranscriber } from "@/utils/whisper-transcriber"
import { toaster } from "@mindsparq-ai/ui/toast"
import { createSessionTabs } from "@/pages/session/helpers"
import { createTextFragment, getCursorPosition, setCursorPosition, setRangeEdge } from "./prompt-input/editor-dom"
import { createPromptAttachments } from "./prompt-input/attachments"
import { ACCEPTED_FILE_TYPES, pickAttachmentFiles } from "./prompt-input/files"
import {
  canNavigateHistoryAtCursor,
  navigatePromptHistory,
  prependHistoryEntry,
  type PromptHistoryComment,
  type PromptHistoryEntry,
  type PromptHistoryStoredEntry,
  promptLength,
} from "./prompt-input/history"
import { createPromptSubmit, type FollowupDraft } from "./prompt-input/submit"
import { PromptPopover, type AtOption, type SlashCommand } from "./prompt-input/slash-popover"
import { PromptContextItems } from "./prompt-input/context-items"
import { PromptImageAttachments } from "./prompt-input/image-attachments"
import { PromptDragOverlay } from "./prompt-input/drag-overlay"
import { promptPlaceholder } from "./prompt-input/placeholder"
import { showToast } from "@/utils/toast"
import { ImagePreview } from "@mindsparq-ai/ui/image-preview"
import { pathKey } from "@/utils/path-key"
import { displayName } from "@/pages/layout/helpers"

export type PromptInputState = ReturnType<typeof usePrompt>

export type PromptInputHistory = {
  entries: (mode: "normal" | "shell") => PromptHistoryStoredEntry[]
  add: (prompt: Prompt, mode: "normal" | "shell", comments: PromptHistoryComment[]) => void
}

export type PromptInputSubmission = {
  abort: () => Promise<void> | void
  handleSubmit: (event: Event) => Promise<void> | void
}

export type PromptInputControls = {
  agents: {
    available: { name: string; hidden?: boolean; mode: string }[]
    options: string[]
    current: string
    loading: boolean
    visible: boolean
    select: (name: string | undefined) => void
  }
  model: {
    selection: ReturnType<typeof useLocal>["model"]
    paid: boolean
    loading: boolean
  }
  projects: {
    available: { name?: string; worktree: string; sandboxes?: string[] }[]
    directory: string
    select: (worktree: string) => void
    add: (title: string) => void
  }
  session: {
    id?: string
    tabs: {
      active: () => string | undefined
      all: () => string[]
      open: (tab: string) => void | Promise<void>
      setActive: (tab: string) => void
    }
    reviewPanel: {
      opened: () => boolean
      open: () => void
    }
  }
  newLayoutDesigns: boolean
}

export function createPromptInputHistory(): PromptInputHistory {
  const [normal, setNormal] = createStore<PromptHistoryState>({ entries: [] })
  const [shell, setShell] = createStore<PromptHistoryState>({ entries: [] })
  return createPromptInputHistoryStore(normal, setNormal, shell, setShell)
}

type PromptHistoryState = { entries: PromptHistoryStoredEntry[] }

function createPromptInputHistoryStore(
  normal: Store<PromptHistoryState>,
  setNormal: SetStoreFunction<PromptHistoryState>,
  shell: Store<PromptHistoryState>,
  setShell: SetStoreFunction<PromptHistoryState>,
): PromptInputHistory {
  return {
    entries: (mode) => (mode === "shell" ? shell.entries : normal.entries),
    add(prompt, mode, comments) {
      const current = mode === "shell" ? shell : normal
      const setCurrent = mode === "shell" ? setShell : setNormal
      const next = prependHistoryEntry(current.entries, prompt, comments)
      if (next === current.entries) return
      setCurrent("entries", next)
    },
  }
}

function createPersistedPromptInputHistory() {
  const [normal, setNormal] = persisted(
    Persist.global("prompt-history", ["prompt-history.v1"]),
    createStore<PromptHistoryState>({ entries: [] }),
  )
  const [shell, setShell] = persisted(
    Persist.global("prompt-history-shell", ["prompt-history-shell.v1"]),
    createStore<PromptHistoryState>({ entries: [] }),
  )
  return createPromptInputHistoryStore(normal, setNormal, shell, setShell)
}

export interface PromptInputProps {
  class?: string
  variant?: "dock" | "new-session"
  state?: PromptInputState
  history?: PromptInputHistory
  submission?: PromptInputSubmission
  controls: PromptInputControls
  ref?: (el: HTMLDivElement) => void
  newSessionWorktree?: string
  onNewSessionWorktreeReset?: () => void
  edit?: { id: string; prompt: Prompt; context: FollowupDraft["context"] }
  onEditLoaded?: () => void
  shouldQueue?: () => boolean
  onQueue?: (draft: FollowupDraft) => void
  onAbort?: () => void
  onSubmit?: () => void
}

const EXAMPLES = [
  "prompt.example.1",
  "prompt.example.2",
  "prompt.example.3",
  "prompt.example.4",
  "prompt.example.5",
  "prompt.example.6",
  "prompt.example.7",
  "prompt.example.8",
  "prompt.example.9",
  "prompt.example.10",
  "prompt.example.11",
  "prompt.example.12",
  "prompt.example.13",
  "prompt.example.14",
  "prompt.example.15",
  "prompt.example.16",
  "prompt.example.17",
  "prompt.example.18",
  "prompt.example.19",
  "prompt.example.20",
  "prompt.example.21",
  "prompt.example.22",
  "prompt.example.23",
  "prompt.example.24",
  "prompt.example.25",
] as const

export const PromptInput: Component<PromptInputProps> = (props) => {
  const sdk = useSDK()

  const sync = useSync()
  const files = useFile()
  const prompt = props.state ?? usePrompt()
  const layout = useLayout()
  const comments = useComments()
  const dialog = useDialog()
  const command = useCommand()
  const permission = usePermission()
  const language = useLanguage()
  const platform = usePlatform()
  const settings = useSettings()
  const tabs = () => props.controls.session.tabs
  let editorRef!: HTMLDivElement
  let fileInputRef: HTMLInputElement | undefined
  let scrollRef!: HTMLDivElement
  let slashPopoverRef!: HTMLDivElement
  let projectSearchRef: HTMLInputElement | undefined

  createEffect(() => {
    const handleSendToChat = (e: any) => {
      const textVal = e.detail?.text
      if (!textVal) return
      
      const nextParts = [{ type: "text" as const, content: textVal, start: 0, end: 0 }]
      prompt.set(nextParts)
      queueScroll()
      requestAnimationFrame(() => {
        editorRef.focus()
      })
    }
    window.addEventListener("send-to-chat", handleSendToChat)
    onCleanup(() => {
      window.removeEventListener("send-to-chat", handleSendToChat)
    })
  })

  const mirror = { input: false }
  const inset = 56
  const space = `${inset}px`

  const scrollCursorIntoView = () => {
    const container = scrollRef
    const selection = window.getSelection()
    if (!container || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!editorRef.contains(range.startContainer)) return

    const cursor = getCursorPosition(editorRef)
    const length = promptLength(prompt.current().filter((part) => part.type !== "image"))
    if (cursor >= length) {
      container.scrollTop = container.scrollHeight
      return
    }

    const rect = range.getClientRects().item(0) ?? range.getBoundingClientRect()
    if (!rect.height) return

    const containerRect = container.getBoundingClientRect()
    const top = rect.top - containerRect.top + container.scrollTop
    const bottom = rect.bottom - containerRect.top + container.scrollTop
    const padding = 12

    if (top < container.scrollTop + padding) {
      container.scrollTop = Math.max(0, top - padding)
      return
    }

    if (bottom > container.scrollTop + container.clientHeight - inset) {
      container.scrollTop = bottom - container.clientHeight + inset
    }
  }

  const queueScroll = (count = 2) => {
    requestAnimationFrame(() => {
      scrollCursorIntoView()
      if (count > 1) queueScroll(count - 1)
    })
  }

  const activeFileTab = createSessionTabs({
    tabs,
    pathFromTab: files.pathFromTab,
    normalizeTab: (tab) => (tab.startsWith("file://") ? files.tab(tab) : tab),
  }).activeFileTab

  const commentInReview = (path: string) => {
    const sessionID = props.controls.session.id
    if (!sessionID) return false

    const diffs = sync().data.session_diff[sessionID]
    if (!diffs) return false
    return diffs.some((diff) => diff.file === path)
  }

  const openComment = (item: { path: string; commentID?: string; commentOrigin?: "review" | "file" }) => {
    if (!item.commentID) return

    const focus = { file: item.path, id: item.commentID }
    comments.setActive(focus)

    const queueCommentFocus = (attempts = 6) => {
      const schedule = (left: number) => {
        requestAnimationFrame(() => {
          comments.setFocus({ ...focus })
          if (left <= 0) return
          requestAnimationFrame(() => {
            const current = comments.focus()
            if (!current) return
            if (current.file !== focus.file || current.id !== focus.id) return
            schedule(left - 1)
          })
        })
      }

      schedule(attempts)
    }

    const wantsReview = item.commentOrigin === "review" || (item.commentOrigin !== "file" && commentInReview(item.path))
    if (wantsReview) {
      if (!props.controls.session.reviewPanel.opened()) props.controls.session.reviewPanel.open()
      layout.fileTree.setTab("changes")
      tabs().setActive("review")
      queueCommentFocus()
      return
    }

    if (!props.controls.session.reviewPanel.opened()) props.controls.session.reviewPanel.open()
    layout.fileTree.setTab("all")
    const tab = files.tab(item.path)
    void tabs().open(tab)
    tabs().setActive(tab)
    void Promise.resolve(files.load(item.path)).finally(() => queueCommentFocus())
  }

  const recent = createMemo(() => {
    const all = tabs().all()
    const active = activeFileTab()
    const order = active ? [active, ...all.filter((x) => x !== active)] : all
    const seen = new Set<string>()
    const paths: string[] = []

    for (const tab of order) {
      const path = files.pathFromTab(tab)
      if (!path) continue
      if (seen.has(path)) continue
      seen.add(path)
      paths.push(path)
    }

    return paths
  })
  const info = createMemo(() => (props.controls.session.id ? sync().session.get(props.controls.session.id) : undefined))
  const working = createMemo(() => sync().data.session_working(props.controls.session.id ?? ""))
  const imageAttachments = createMemo(() =>
    prompt.current().filter((part): part is ImageAttachmentPart => part.type === "image"),
  )

  const [store, setStore] = createStore<{
    popover: "at" | "slash" | null
    historyIndex: number
    savedPrompt: PromptHistoryEntry | null
    placeholder: number
    draggingType: "image" | "@mention" | null
    mode: "normal" | "shell"
    applyingHistory: boolean
    variantOpen: boolean
  }>({
    popover: null,
    historyIndex: -1,
    savedPrompt: null as PromptHistoryEntry | null,
    placeholder: Math.floor(Math.random() * EXAMPLES.length),
    draggingType: null,
    mode: "normal",
    applyingHistory: false,
    variantOpen: false,
  })
  const [picker, setPicker] = createStore({
    projectOpen: false,
    projectSearch: "",
  })

  const buttonsSpring = useSpring(() => (store.mode === "normal" ? 1 : 0), { visualDuration: 0.2, bounce: 0 })
  const motion = (value: number) => ({
    opacity: value,
    transform: `scale(${0.98 + value * 0.02})`,
    filter: `blur(${(1 - value) * 2}px)`,
    "pointer-events": value > 0.5 ? ("auto" as const) : ("none" as const),
  })
  const buttons = createMemo(() => motion(buttonsSpring()))
  const shell = createMemo(() => motion(1 - buttonsSpring()))
  const control = createMemo(() => ({ height: "24px", ...buttons() }))

  const commentCount = createMemo(() => {
    if (store.mode === "shell") return 0
    return prompt.context.items().filter((item) => !!item.comment?.trim()).length
  })
  const blank = createMemo(() => {
    const text = prompt
      .current()
      .map((part) => ("content" in part ? part.content : ""))
      .join("")
    return text.trim().length === 0 && imageAttachments().length === 0 && commentCount() === 0
  })
  const stopping = createMemo(() => working() && blank())
  const tip = () => {
    if (stopping()) {
      return (
        <div class="flex items-center gap-2">
          <span>{language.t("prompt.action.stop")}</span>
          <span class="text-icon-base text-12-medium text-[10px]!">{language.t("common.key.esc")}</span>
        </div>
      )
    }

    return (
      <div class="flex items-center gap-2">
        <span>{language.t("prompt.action.send")}</span>
        <Icon name="enter" size="small" class="text-icon-base" />
      </div>
    )
  }

  const contextItems = createMemo(() => {
    const items = prompt.context.items()
    if (store.mode !== "shell") return items
    return items.filter((item) => !item.comment?.trim())
  })

  const hasUserPrompt = createMemo(() => {
    const sessionID = props.controls.session.id
    if (!sessionID) return false
    const messages = sync().data.message[sessionID]
    if (!messages) return false
    return messages.some((m) => m.role === "user")
  })

  const history = props.history ?? createPersistedPromptInputHistory()

  const [isListening, setIsListening] = createSignal(false)
  const [isTranscribing, setIsTranscribing] = createSignal(false)
  // "checking" | "available" | "unavailable"
  const [voiceCapability, setVoiceCapability] = createSignal<"checking" | "available" | "unavailable">("checking")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recognition: any = null
  let micStream: MediaStream | null = null
  let localRecorder: any = null
  let latestVoiceText = ""

  onMount(() => {
    // Check voice capability based on selected engine
    const engine = settings.voice.engine()

    // Local Whisper and API-based engines (openai, gemini, groq, huggingface) only need mic access
    if (engine === "local" || engine === "openai" || engine === "gemini" || engine === "groq" || engine === "huggingface") {
      void (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          stream.getTracks().forEach((t) => t.stop())
          setVoiceCapability("available")
        } catch {
          // getUserMedia failed — mic permission denied
          setVoiceCapability("unavailable")
        }
      })()
      return
    }

    // Cloud engine requires Web Speech API (only works in browsers, NOT Electron)
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach((t) => t.stop())
        const win = window as unknown as Record<string, unknown>
        const hasSpeechAPI = !!(win["SpeechRecognition"] || win["webkitSpeechRecognition"])
        if (hasSpeechAPI) {
          setVoiceCapability("available")
        } else {
          // Web Speech API not available (e.g. Electron) — auto-switch to local engine
          console.warn("[VOICE] SpeechRecognition API not available. Switching to local Whisper engine.")
          settings.voice.setEngine("local")
          setVoiceCapability("available")
        }
      } catch {
        setVoiceCapability("unavailable")
      }
    })()
  })

  // Re-check voice capability when engine changes
  createEffect(() => {
    const engine = settings.voice.engine()
    // Local and API-based engines only need mic
    if (engine === "local" || engine === "openai" || engine === "gemini" || engine === "groq" || engine === "huggingface") {
      void (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          stream.getTracks().forEach((t) => t.stop())
          setVoiceCapability("available")
        } catch {
          setVoiceCapability("unavailable")
        }
      })()
      return
    }
    // Cloud engine needs SpeechRecognition
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach((t) => t.stop())
        const win = window as unknown as Record<string, unknown>
        const hasSpeechAPI = !!(win["SpeechRecognition"] || win["webkitSpeechRecognition"])
        setVoiceCapability(hasSpeechAPI ? "available" : "unavailable")
      } catch {
        setVoiceCapability("unavailable")
      }
    })()
  })

  onMount(() => {
    let downloadToastId: number | null = null

    const unsubscribe = WhisperTranscriber.subscribeProgress((progress) => {
      if (progress.status === "initiate" || progress.status === "downloading") {
        const percent = Math.round(progress.progress)
        const filename = progress.file.split("/").pop() ?? ""
        const title = "Downloading Local AI Model"
        const description = `Loading ${filename}... (${percent}%)`

        if (downloadToastId !== null) {
          toaster.dismiss(downloadToastId)
        }

        downloadToastId = showToast({
          title,
          description,
          variant: "loading",
          persistent: true,
        }) ?? null
      } else if (progress.status === "done") {
        if (downloadToastId !== null) {
          toaster.dismiss(downloadToastId)
          downloadToastId = null
        }
        showToast({
          title: "Model Loaded",
          description: "Local Whisper model is ready.",
          variant: "success",
          duration: 3000,
        })
      }
    })

    onCleanup(() => {
      unsubscribe()
      if (downloadToastId !== null) {
        toaster.dismiss(downloadToastId)
      }
    })
  })

  const stopListening = async () => {
    console.log("[EVENT] stopListening triggered. engine:", settings.voice.engine())
    const voiceEngine = settings.voice.engine()
    if (voiceEngine === "local" || voiceEngine === "openai" || voiceEngine === "gemini" || voiceEngine === "groq" || voiceEngine === "huggingface") {
      if (!localRecorder) {
        console.warn("[VOICE] stopListening called but localRecorder is not set")
        return
      }
      setIsListening(false)
      setIsTranscribing(true)
      try {
        console.log("[VOICE] Stopping localRecorder...")
        const audioData = await localRecorder.stop()
        console.log("[VOICE] localRecorder stopped. Transcribing audio...")
        
        let voiceText = ""
        if (voiceEngine === "local") {
          voiceText = await WhisperTranscriber.transcribe(
            audioData,
            settings.voice.model(),
            settings.voice.language(),
          )
        } else if (voiceEngine === "openai") {
          const key = settings.voice.openaiApiKey()
          if (!key) {
            throw new Error("OpenAI API Key is missing. Please configure it in settings.")
          }
          const wavBlob = encodeWAV(audioData)
          voiceText = await transcribeWithOpenAI(wavBlob, key, settings.voice.language())
        } else if (voiceEngine === "gemini") {
          const key = settings.voice.geminiApiKey()
          if (!key) {
            throw new Error("Gemini API Key is missing. Please configure it in settings.")
          }
          const wavBlob = encodeWAV(audioData)
          voiceText = await transcribeWithGemini(wavBlob, key, settings.voice.language())
        } else if (voiceEngine === "groq") {
          const key = settings.voice.groqApiKey()
          if (!key) {
            throw new Error("Groq API Key is missing. Please configure it in settings.")
          }
          const wavBlob = encodeWAV(audioData)
          voiceText = await transcribeWithGroq(wavBlob, key, settings.voice.language())
        } else if (voiceEngine === "huggingface") {
          const token = settings.voice.huggingfaceToken()
          const wavBlob = encodeWAV(audioData)
          voiceText = await transcribeWithHuggingFace(wavBlob, token, settings.voice.language())
        }
        
        console.log(`[WHISPER] Received transcription result: "${voiceText}"`)

        // Guard: reject output in wrong script (e.g. Chinese/Urdu when Nepali selected)
        voiceText = validateTranscriptScript(voiceText, settings.voice.language())

        if (voiceText && voiceText.trim()) {
          const startPrompt = prompt.current().map((p) => ({ ...p }))
          const nextParts = startPrompt.map((p) => ({ ...p }))
          const lastPartIndex = nextParts.length - 1
          const lastPart = nextParts[lastPartIndex]
          const separator =
            lastPart && lastPart.type === "text" && lastPart.content && !lastPart.content.endsWith(" ") ? " " : ""
          const newText = separator + voiceText.trim()

          console.log(`[STATE] Appending voiceText: "${newText}" to last part:`, JSON.stringify(lastPart))
          if (lastPart && lastPart.type === "text") {
            nextParts[lastPartIndex] = { ...lastPart, content: lastPart.content + newText }
          } else {
            nextParts.push({ type: "text", content: newText, start: 0, end: 0 })
          }

          const newLength = promptLength(nextParts)
          console.log(`[STATE] Setting prompt store. New length: ${newLength}. parts:`, JSON.stringify(nextParts))
          prompt.set(nextParts, newLength)
          queueScroll()
          requestAnimationFrame(() => {
            console.log("[UI] Focusing editorRef and setting cursor position to:", newLength)
            if (editorRef) {
              editorRef.focus()
              setCursorPosition(editorRef, newLength)
            } else {
              console.error("[UI] editorRef is undefined inside stopListening requestAnimationFrame!")
            }
          })
        } else {
          console.warn("[WHISPER] Transcription result was empty or whitespace only")
        }
      } catch (err: any) {
        console.error("Transcription error:", err)
        showToast({
          title: "Voice Input Error",
          description: err?.message || "An error occurred during transcription.",
        })
      } finally {
        setIsTranscribing(false)
        localRecorder = null
      }
      return
    }

    console.log("[EVENT] Stopping cloud SpeechRecognition...")
    recognition?.stop()
    recognition = null
    micStream?.getTracks().forEach((t) => t.stop())
    micStream = null
    setIsListening(false)

    if (latestVoiceText.trim()) {
      console.log(`[EVENT] SpeechRecognition finished. Text: "${latestVoiceText}"`)
      const currentPrompt = prompt.current()
      const lastPart = currentPrompt[currentPrompt.length - 1]
      const separator =
        lastPart && lastPart.type === "text" && lastPart.content && !lastPart.content.endsWith(" ") ? " " : ""
      const existingText = lastPart?.type === "text" ? lastPart.content : ""
      if (!existingText.endsWith(latestVoiceText.trim())) {
        const nextParts = currentPrompt.map((p) => ({ ...p }))
        if (lastPart?.type === "text") {
          nextParts[nextParts.length - 1] = { ...lastPart, content: lastPart.content + separator + latestVoiceText.trim() }
        } else {
          nextParts.push({ type: "text", content: latestVoiceText.trim(), start: 0, end: 0 })
        }
        const newLength = promptLength(nextParts)
        console.log(`[STATE] Setting SpeechRecognition prompt store. New length: ${newLength}`)
        prompt.set(nextParts, newLength)
        queueScroll()
        requestAnimationFrame(() => {
          console.log("[UI] Focusing editorRef and setting cursor position to:", newLength)
          if (editorRef) {
            editorRef.focus()
            setCursorPosition(editorRef, newLength)
          } else {
            console.error("[UI] editorRef is undefined inside stopListening (SpeechRecognition) requestAnimationFrame!")
          }
        })
      }
    }
    latestVoiceText = ""
  }

  const toggleListening = async () => {
    if (isListening() || isTranscribing()) {
      void stopListening()
      return
    }

    const voiceEngine = settings.voice.engine()
    if (voiceEngine === "local" || voiceEngine === "openai" || voiceEngine === "gemini" || voiceEngine === "groq" || voiceEngine === "huggingface") {
      if (voiceEngine === "local") {
        try {
          setIsTranscribing(true)
          // Ensure Whisper model is preloaded/cached (offline ready)
          await WhisperTranscriber.preloadModel(settings.voice.model())
          setIsTranscribing(false)
        } catch (err: any) {
          setIsTranscribing(false)
          showToast({
            title: "Local Speech Model Failed to Load",
            description: `Could not load local transcription model: ${err?.message ?? String(err)}. Check your internet connection.`,
          })
          return
        }
      }

      try {
        const { AudioRecorder } = await import("@/utils/audio-recorder")
        localRecorder = new AudioRecorder()
        await localRecorder.start()
        setIsListening(true)
      } catch (err: any) {
        const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
        showToast({
          title: denied ? "Microphone Access Denied" : "Microphone Unavailable",
          description: denied
            ? "Please allow microphone access in your system settings and try again."
            : `Could not access microphone: ${err?.message ?? String(err)}`,
        })
        localRecorder = null
      }
      return
    }

    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechCtor) {
      // Auto-switch to local engine if SpeechRecognition is not available (e.g. Electron)
      console.warn("[VOICE] SpeechRecognition not available. Auto-switching to local Whisper engine.")
      settings.voice.setEngine("local")
      showToast({
        title: "Switched to Local Voice Engine",
        description: "Web Speech API is not available in this environment. Using local Whisper instead.",
      })
      // Re-trigger with local engine after a brief delay
      setTimeout(() => void toggleListening(), 500)
      return
    }

    // Request mic permission explicitly — required in Electron before SpeechRecognition can access it
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err: any) {
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
      showToast({
        title: denied ? "Microphone Access Denied" : "Microphone Unavailable",
        description: denied
          ? "Please allow microphone access in your system settings and try again."
          : `Could not access microphone: ${err?.message ?? String(err)}`,
      })
      return
    }

    const speechLocaleMap: Record<string, string> = {
      en: "en-US",
      ne: "ne-NP",
      hi: "hi-IN",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      ja: "ja-JP",
      zh: "zh-CN",
    }

    recognition = new SpeechCtor()
    recognition.continuous = true
    recognition.interimResults = true
    const voiceLang = settings.voice.language()
    recognition.lang = voiceLang && voiceLang !== "auto"
      ? (speechLocaleMap[voiceLang] ?? voiceLang)
      : "ne-NP"

    const startPrompt = prompt.current().map((p) => ({ ...p }))

    recognition.onstart = () => {
      setIsListening(true)
    }

    const streamAtStart = micStream
    recognition.onend = () => {
      streamAtStart?.getTracks().forEach((t) => t.stop())
      if (micStream === streamAtStart) micStream = null
      recognition = null
      setIsListening(false)
    }

    recognition.onerror = (e: any) => {
      const code: string = e?.error ?? "unknown"
      console.error("Speech recognition error:", code, e)

      if (code === "network" || code === "service-not-allowed") {
        showToast({
          title: "Cloud Voice Input Failed",
          description: "Network error. Switching to local offline Whisper engine...",
        })
        settings.voice.setEngine("local")
        void stopListening()
        setTimeout(() => {
          void toggleListening()
        }, 1000)
        return
      }

      if (code === "no-speech" && latestVoiceText) {
        void stopListening()
        return
      }

      const messages: Record<string, string> = {
        "not-allowed": "Microphone access was denied. Check your system permissions.",
        "service-not-allowed": "Speech service is not allowed. Make sure you are connected to the internet.",
        "network": "Network error — speech recognition requires an internet connection.",
        "no-speech": "No speech detected. Please speak clearly and try again.",
        "audio-capture": "Could not capture audio. Check that your microphone is connected.",
        "aborted": "",
      }
      const description = messages[code]
      if (description) {
        showToast({ title: "Voice Input Error", description })
      }
      void stopListening()
    }

    recognition.onresult = (event: any) => {
      let voiceText = ""
      for (let i = 0; i < event.results.length; ++i) {
        voiceText += event.results[i][0].transcript
      }
      latestVoiceText = voiceText

      const nextParts = startPrompt.map((p) => ({ ...p }))
      const lastPartIndex = nextParts.length - 1
      const lastPart = nextParts[lastPartIndex]
      const separator =
        lastPart && lastPart.type === "text" && lastPart.content && !lastPart.content.endsWith(" ") ? " " : ""
      const newText = separator + voiceText

      if (lastPart && lastPart.type === "text") {
        nextParts[lastPartIndex] = { ...lastPart, content: lastPart.content + newText }
      } else {
        nextParts.push({ type: "text", content: newText, start: 0, end: 0 })
      }

      const newLength = promptLength(nextParts)
      prompt.set(nextParts, newLength)
      queueScroll()
      requestAnimationFrame(() => {
        setCursorPosition(editorRef, newLength)
      })
    }

    recognition.start()
  }

  onCleanup(() => {
    stopListening()
  })

  const suggest = createMemo(() => !hasUserPrompt())

  const placeholder = createMemo(() =>
    promptPlaceholder({
      mode: store.mode,
      commentCount: commentCount(),
      example: suggest() ? (store.mode === "shell" ? "git status" : language.t(EXAMPLES[store.placeholder])) : "",
      suggest: suggest(),
      t: (key, params) => language.t(key as Parameters<typeof language.t>[0], params as never),
    }),
  )

  const historyComments = () => {
    const byID = new Map(comments.all().map((item) => [`${item.file}\n${item.id}`, item] as const))
    return prompt.context.items().flatMap((item) => {
      if (item.type !== "file") return []
      const comment = item.comment?.trim()
      if (!comment) return []

      const selection = item.commentID ? byID.get(`${item.path}\n${item.commentID}`)?.selection : undefined
      const nextSelection =
        selection ??
        (item.selection
          ? ({
              start: item.selection.startLine,
              end: item.selection.endLine,
            } satisfies SelectedLineRange)
          : undefined)
      if (!nextSelection) return []

      return [
        {
          id: item.commentID ?? item.key,
          path: item.path,
          selection: { ...nextSelection },
          comment,
          time: item.commentID ? (byID.get(`${item.path}\n${item.commentID}`)?.time ?? Date.now()) : Date.now(),
          origin: item.commentOrigin,
          preview: item.preview,
        } satisfies PromptHistoryComment,
      ]
    })
  }

  const applyHistoryComments = (items: PromptHistoryComment[]) => {
    comments.replace(
      items.map((item) => ({
        id: item.id,
        file: item.path,
        selection: { ...item.selection },
        comment: item.comment,
        time: item.time,
      })),
    )
    prompt.context.replaceComments(
      items.map((item) => ({
        type: "file" as const,
        path: item.path,
        selection: selectionFromLines(item.selection),
        comment: item.comment,
        commentID: item.id,
        commentOrigin: item.origin,
        preview: item.preview,
      })),
    )
  }

  const applyHistoryPrompt = (entry: PromptHistoryEntry, position: "start" | "end") => {
    const p = entry.prompt
    const length = position === "start" ? 0 : promptLength(p)
    setStore("applyingHistory", true)
    applyHistoryComments(entry.comments)
    prompt.set(p, length)
    requestAnimationFrame(() => {
      editorRef.focus()
      setCursorPosition(editorRef, length)
      setStore("applyingHistory", false)
      queueScroll()
    })
  }

  const getCaretState = () => {
    const selection = window.getSelection()
    const textLength = promptLength(prompt.current())
    if (!selection || selection.rangeCount === 0) {
      return { collapsed: false, cursorPosition: 0, textLength }
    }
    const anchorNode = selection.anchorNode
    if (!anchorNode || !editorRef.contains(anchorNode)) {
      return { collapsed: false, cursorPosition: 0, textLength }
    }
    return {
      collapsed: selection.isCollapsed,
      cursorPosition: getCursorPosition(editorRef),
      textLength,
    }
  }

  const escBlur = () => platform.platform === "desktop" && platform.os === "macos"

  const pick = () => {
    pickAttachmentFiles({
      picker: platform.openAttachmentPickerDialog,
      directory: () => sdk().directory,
      fallback: () => fileInputRef?.click(),
      onFile: addAttachment,
      onError: (error) =>
        showToast({
          variant: "error",
          title: language.t("common.requestFailed"),
          description: error instanceof Error ? error.message : String(error),
        }),
    })
  }

  const setMode = (mode: "normal" | "shell") => {
    setStore("mode", mode)
    setStore("popover", null)
    requestAnimationFrame(() => editorRef?.focus())
  }

  const shellModeKey = "mod+shift+x"
  const normalModeKey = "mod+shift+e"

  command.register("prompt-input", () => [
    {
      id: "file.attach",
      title: language.t("prompt.action.attachFile"),
      category: language.t("command.category.file"),
      keybind: "mod+u",
      disabled: store.mode !== "normal",
      onSelect: pick,
    },
    {
      id: "prompt.mode.shell",
      title: language.t("command.prompt.mode.shell"),
      category: language.t("command.category.session"),
      keybind: shellModeKey,
      disabled: store.mode === "shell",
      onSelect: () => setMode("shell"),
    },
    {
      id: "prompt.mode.normal",
      title: language.t("command.prompt.mode.normal"),
      category: language.t("command.category.session"),
      keybind: normalModeKey,
      disabled: store.mode === "normal",
      onSelect: () => setMode("normal"),
    },
  ])

  const closePopover = () => setStore("popover", null)

  const resetHistoryNavigation = (force = false) => {
    if (!force && (store.historyIndex < 0 || store.applyingHistory)) return
    setStore("historyIndex", -1)
    setStore("savedPrompt", null)
  }

  const clearEditor = () => {
    editorRef.innerHTML = ""
  }

  const setEditorText = (text: string) => {
    clearEditor()
    editorRef.textContent = text
  }

  const focusEditorEnd = () => {
    requestAnimationFrame(() => {
      editorRef.focus()
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(editorRef)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    })
  }

  const currentCursor = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.contains(selection.anchorNode)) return null
    return getCursorPosition(editorRef)
  }

  const restoreFocus = () => {
    requestAnimationFrame(() => {
      const cursor = prompt.cursor() ?? promptLength(prompt.current())
      editorRef.focus()
      setCursorPosition(editorRef, cursor)
      queueScroll()
    })
  }

  const renderEditorWithCursor = (parts: Prompt) => {
    const cursor = currentCursor()
    renderEditor(parts)
    if (cursor !== null) setCursorPosition(editorRef, cursor)
  }

  createEffect(() => {
    props.controls.session.id
    if (props.controls.session.id) return
    if (!suggest()) return
    const interval = setInterval(() => {
      setStore("placeholder", (prev) => (prev + 1) % EXAMPLES.length)
    }, 6500)
    onCleanup(() => clearInterval(interval))
  })

  const [composing, setComposing] = createSignal(false)
  const isImeComposing = (event: KeyboardEvent) => event.isComposing || composing() || event.keyCode === 229

  const handleBlur = () => {
    closePopover()
    setComposing(false)
  }

  const handleCompositionStart = () => {
    setComposing(true)
  }

  const handleCompositionEnd = () => {
    setComposing(false)
    requestAnimationFrame(() => {
      if (composing()) return
      reconcile(prompt.current().filter((part) => part.type !== "image"))
    })
  }

  const agentList = createMemo(() =>
    props.controls.agents.available
      .filter((agent) => !agent.hidden && agent.mode !== "primary")
      .map((agent): AtOption => ({ type: "agent", name: agent.name, display: agent.name })),
  )

  const handleAtSelect = (option: AtOption | undefined) => {
    if (!option) return
    if (option.type === "agent") {
      addPart({ type: "agent", name: option.name, content: "@" + option.name, start: 0, end: 0 })
    } else {
      addPart({ type: "file", path: option.path, content: "@" + option.path, start: 0, end: 0 })
    }
  }

  const atKey = (x: AtOption | undefined) => {
    if (!x) return ""
    return x.type === "agent" ? `agent:${x.name}` : `file:${x.path}`
  }

  const {
    flat: atFlat,
    active: atActive,
    setActive: setAtActive,
    onInput: atOnInput,
    onKeyDown: atOnKeyDown,
  } = useFilteredList<AtOption>({
    items: async (query) => {
      const agents = agentList()
      const open = recent()
      const seen = new Set(open)
      const pinned: AtOption[] = open.map((path) => ({ type: "file", path, display: path, recent: true }))
      if (!query.trim()) return [...agents, ...pinned]
      const paths = await files.searchFilesAndDirectories(query)
      const fileOptions: AtOption[] = paths
        .filter((path) => !seen.has(path))
        .map((path) => ({ type: "file", path, display: path }))
      return [...agents, ...pinned, ...fileOptions]
    },
    key: atKey,
    filterKeys: ["display"],
    skipFilter: (item) => item.type === "file" && !item.recent,
    groupBy: (item) => {
      if (item.type === "agent") return "agent"
      if (item.recent) return "recent"
      return "file"
    },
    sortGroupsBy: (a, b) => {
      const rank = (category: string) => {
        if (category === "agent") return 0
        if (category === "recent") return 1
        return 2
      }
      return rank(a.category) - rank(b.category)
    },
    onSelect: handleAtSelect,
  })

  const slashCommands = createMemo<SlashCommand[]>(() => {
    const builtin = command.options
      .filter((opt) => !opt.disabled && !opt.id.startsWith("suggested.") && opt.slash)
      .map((opt) => ({
        id: opt.id,
        trigger: opt.slash!,
        title: opt.title,
        description: opt.description,
        keybind: opt.keybind,
        type: "builtin" as const,
      }))

    const custom = sync().data.command.map((cmd) => ({
      id: `custom.${cmd.name}`,
      trigger: cmd.name,
      title: cmd.name,
      description: cmd.description,
      type: "custom" as const,
      source: cmd.source,
    }))

    return [...custom, ...builtin]
  })

  const handleSlashSelect = (cmd: SlashCommand | undefined) => {
    if (!cmd) return
    closePopover()
    const images = imageAttachments()

    if (cmd.type === "custom") {
      const text = `/${cmd.trigger} `
      setEditorText(text)
      prompt.set([{ type: "text", content: text, start: 0, end: text.length }, ...images], text.length)
      focusEditorEnd()
      return
    }

    clearEditor()
    prompt.set([...DEFAULT_PROMPT, ...images], 0)
    command.trigger(cmd.id, "slash")
  }

  const {
    flat: slashFlat,
    active: slashActive,
    setActive: setSlashActive,
    onInput: slashOnInput,
    onKeyDown: slashOnKeyDown,
  } = useFilteredList<SlashCommand>({
    items: slashCommands,
    key: (x) => x?.id,
    filterKeys: ["trigger", "title"],
    onSelect: handleSlashSelect,
  })

  const createPill = (part: FileAttachmentPart | AgentPart) => {
    const pill = document.createElement("span")
    pill.textContent = part.content
    pill.setAttribute("data-type", part.type)
    if (part.type === "file") pill.setAttribute("data-path", part.path)
    if (part.type === "agent") pill.setAttribute("data-name", part.name)
    pill.setAttribute("contenteditable", "false")
    pill.style.userSelect = "text"
    pill.style.cursor = "default"
    return pill
  }

  const isNormalizedEditor = () =>
    Array.from(editorRef.childNodes).every((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ""
        if (!text.includes("\u200B")) return true
        if (text !== "\u200B") return false

        const prev = node.previousSibling
        const next = node.nextSibling
        const prevIsBr = prev?.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).tagName === "BR"
        return !!prevIsBr && !next
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return false
      const el = node as HTMLElement
      if (el.dataset.type === "file") return true
      if (el.dataset.type === "agent") return true
      return el.tagName === "BR"
    })

  const renderEditor = (parts: Prompt) => {
    console.log("[UI] renderEditor called with parts:", JSON.stringify(parts))
    if (!editorRef) {
      console.error("[UI] renderEditor called but editorRef is undefined!")
      return
    }
    clearEditor()
    for (const part of parts) {
      if (part.type === "text") {
        editorRef.appendChild(createTextFragment(part.content))
        continue
      }
      if (part.type === "file" || part.type === "agent") {
        editorRef.appendChild(createPill(part))
      }
    }

    const last = editorRef.lastChild
    if (last?.nodeType === Node.ELEMENT_NODE && (last as HTMLElement).tagName === "BR") {
      editorRef.appendChild(document.createTextNode("\u200B"))
    }
    console.log("[UI] renderEditor completed. editorRef textContent:", editorRef.textContent)
  }

  // Auto-scroll active command into view when navigating with keyboard
  createEffect(() => {
    const activeId = slashActive()
    if (!activeId || !slashPopoverRef) return

    requestAnimationFrame(() => {
      const element = slashPopoverRef.querySelector(`[data-slash-id="${activeId}"]`)
      element?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  })
  const selectPopoverActive = () => {
    if (store.popover === "at") {
      const items = atFlat()
      if (items.length === 0) return
      const active = atActive()
      const item = items.find((entry) => atKey(entry) === active) ?? items[0]
      handleAtSelect(item)
      return
    }

    if (store.popover === "slash") {
      const items = slashFlat()
      if (items.length === 0) return
      const active = slashActive()
      const item = items.find((entry) => entry.id === active) ?? items[0]
      handleSlashSelect(item)
    }
  }

  const reconcile = (input: Prompt) => {
    console.log("[INPUT] reconcile called with input:", JSON.stringify(input), "mirror.input:", mirror.input)
    if (mirror.input) {
      mirror.input = false
      const norm = isNormalizedEditor()
      console.log("[INPUT] reconcile: mirror.input is true. isNormalizedEditor:", norm)
      if (norm) return

      renderEditorWithCursor(input)
      return
    }

    const dom = parseFromDOM()
    const norm = isNormalizedEditor()
    const equal = isPromptEqual(input, dom)
    console.log("[INPUT] reconcile: isNormalizedEditor:", norm, "isPromptEqual:", equal, "dom:", JSON.stringify(dom))
    if (norm && equal) return

    renderEditorWithCursor(input)
  }

  createEffect(
    on(
      () => prompt.current(),
      (parts) => {
        if (composing()) return
        reconcile(parts.filter((part) => part.type !== "image"))
      },
    ),
  )

  const parseFromDOM = (): Prompt => {
    const parts: Prompt = []
    let position = 0
    let buffer = ""

    const flushText = () => {
      let content = buffer
      if (content.includes("\r")) content = content.replace(/\r\n?/g, "\n")
      if (content.includes("\u200B")) content = content.replace(/\u200B/g, "")
      buffer = ""
      if (!content) return
      parts.push({ type: "text", content, start: position, end: position + content.length })
      position += content.length
    }

    const pushFile = (file: HTMLElement) => {
      const content = file.textContent ?? ""
      parts.push({
        type: "file",
        path: file.dataset.path!,
        content,
        start: position,
        end: position + content.length,
      })
      position += content.length
    }

    const pushAgent = (agent: HTMLElement) => {
      const content = agent.textContent ?? ""
      parts.push({
        type: "agent",
        name: agent.dataset.name!,
        content,
        start: position,
        end: position + content.length,
      })
      position += content.length
    }

    const visit = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer += node.textContent ?? ""
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return

      const el = node as HTMLElement
      if (el.dataset.type === "file") {
        flushText()
        pushFile(el)
        return
      }
      if (el.dataset.type === "agent") {
        flushText()
        pushAgent(el)
        return
      }
      if (el.tagName === "BR") {
        buffer += "\n"
        return
      }

      for (const child of Array.from(el.childNodes)) {
        visit(child)
      }
    }

    const children = Array.from(editorRef.childNodes)
    children.forEach((child, index) => {
      const isBlock = child.nodeType === Node.ELEMENT_NODE && ["DIV", "P"].includes((child as HTMLElement).tagName)
      visit(child)
      if (isBlock && index < children.length - 1) {
        buffer += "\n"
      }
    })

    flushText()

    if (parts.length === 0) parts.push(...DEFAULT_PROMPT)
    return parts
  }

  const handleInput = () => {
    const rawParts = parseFromDOM()
    const images = imageAttachments()
    const cursorPosition = getCursorPosition(editorRef)
    const rawText =
      rawParts.length === 1 && rawParts[0]?.type === "text"
        ? rawParts[0].content
        : rawParts.map((p) => ("content" in p ? p.content : "")).join("")
    const hasNonText = rawParts.some((part) => part.type !== "text")
    const textContent = (editorRef.textContent ?? "").replace(/\u200B/g, "")
    const shouldReset =
      textContent.length === 0 && rawText.replace(/\n/g, "").length === 0 && !hasNonText && images.length === 0

    if (shouldReset) {
      closePopover()
      resetHistoryNavigation()
      if (prompt.dirty()) {
        mirror.input = true
        prompt.set(DEFAULT_PROMPT, 0)
      }
      queueScroll()
      return
    }

    const shellMode = store.mode === "shell"

    if (!shellMode) {
      const atMatch = rawText.substring(0, cursorPosition).match(/@(\S*)$/)
      const slashMatch = rawText.match(/^\/(\S*)$/)

      if (atMatch) {
        atOnInput(atMatch[1])
        setStore("popover", "at")
      } else if (slashMatch) {
        slashOnInput(slashMatch[1])
        setStore("popover", "slash")
      } else {
        closePopover()
      }
    } else {
      closePopover()
    }

    resetHistoryNavigation()

    mirror.input = true
    prompt.set([...rawParts, ...images], cursorPosition)
    queueScroll()
  }

  const addPart = (part: ContentPart) => {
    if (part.type === "image") return false

    const selection = window.getSelection()
    if (!selection) return false

    if (selection.rangeCount === 0 || !editorRef.contains(selection.anchorNode)) {
      editorRef.focus()
      const cursor = prompt.cursor() ?? promptLength(prompt.current())
      setCursorPosition(editorRef, cursor)
    }

    if (selection.rangeCount === 0) return false
    const range = selection.getRangeAt(0)
    if (!editorRef.contains(range.startContainer)) return false

    if (part.type === "file" || part.type === "agent") {
      const cursorPosition = getCursorPosition(editorRef)
      const rawText = prompt
        .current()
        .map((p) => ("content" in p ? p.content : ""))
        .join("")
      const textBeforeCursor = rawText.substring(0, cursorPosition)
      const atMatch = textBeforeCursor.match(/@(\S*)$/)
      const pill = createPill(part)
      const gap = document.createTextNode(" ")

      if (atMatch) {
        const start = atMatch.index ?? cursorPosition - atMatch[0].length
        setRangeEdge(editorRef, range, "start", start)
        setRangeEdge(editorRef, range, "end", cursorPosition)
      }

      range.deleteContents()
      range.insertNode(gap)
      range.insertNode(pill)
      range.setStartAfter(gap)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    if (part.type === "text") {
      const fragment = createTextFragment(part.content)
      const last = fragment.lastChild
      range.deleteContents()
      range.insertNode(fragment)
      if (last) {
        if (last.nodeType === Node.TEXT_NODE) {
          const text = last.textContent ?? ""
          if (text === "\u200B") {
            range.setStart(last, 0)
          }
          if (text !== "\u200B") {
            range.setStart(last, text.length)
          }
        }
        if (last.nodeType !== Node.TEXT_NODE) {
          const isBreak = last.nodeType === Node.ELEMENT_NODE && (last as HTMLElement).tagName === "BR"
          const next = last.nextSibling
          const emptyText = next?.nodeType === Node.TEXT_NODE && (next.textContent ?? "") === ""
          if (isBreak && (!next || emptyText)) {
            const placeholder = next && emptyText ? next : document.createTextNode("\u200B")
            if (!next) last.parentNode?.insertBefore(placeholder, null)
            placeholder.textContent = "\u200B"
            range.setStart(placeholder, 0)
          } else {
            range.setStartAfter(last)
          }
        }
      }
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    handleInput()
    closePopover()
    return true
  }

  const addToHistory = (prompt: Prompt, mode: "normal" | "shell") => {
    history.add(prompt, mode, mode === "shell" ? [] : historyComments())
  }

  createEffect(
    on(
      () => props.edit?.id,
      (id) => {
        const edit = props.edit
        if (!id || !edit) return

        for (const item of prompt.context.items()) {
          prompt.context.remove(item.key)
        }

        for (const item of edit.context) {
          prompt.context.add({
            type: item.type,
            path: item.path,
            selection: item.selection,
            comment: item.comment,
            commentID: item.commentID,
            commentOrigin: item.commentOrigin,
            preview: item.preview,
          })
        }

        setStore("mode", "normal")
        setStore("popover", null)
        setStore("historyIndex", -1)
        setStore("savedPrompt", null)
        prompt.set(edit.prompt, promptLength(edit.prompt))
        requestAnimationFrame(() => {
          editorRef.focus()
          setCursorPosition(editorRef, promptLength(edit.prompt))
          queueScroll()
        })
        props.onEditLoaded?.()
      },
      { defer: true },
    ),
  )

  const navigateHistory = (direction: "up" | "down") => {
    const result = navigatePromptHistory({
      direction,
      entries: history.entries(store.mode),
      historyIndex: store.historyIndex,
      currentPrompt: prompt.current(),
      currentComments: historyComments(),
      savedPrompt: store.savedPrompt,
    })
    if (!result.handled) return false
    setStore("historyIndex", result.historyIndex)
    setStore("savedPrompt", result.savedPrompt)
    applyHistoryPrompt(result.entry, result.cursor)
    return true
  }

  const { addAttachment, addAttachments, removeAttachment, handlePaste } = createPromptAttachments({
    prompt,
    editor: () => editorRef,
    isDialogActive: () => !!dialog.active,
    setDraggingType: (type) => setStore("draggingType", type),
    focusEditor: () => {
      editorRef.focus()
      setCursorPosition(editorRef, promptLength(prompt.current()))
    },
    addPart,
    readClipboardImage: platform.readClipboardImage,
    getPathForFile: platform.getPathForFile,
  })

  const fileAttachmentInput = () => (
    <input
      ref={(el) => (fileInputRef = el)}
      type="file"
      multiple
      accept={ACCEPTED_FILE_TYPES.join(",")}
      class="hidden"
      onChange={(e) => {
        const list = e.currentTarget.files
        if (list) void addAttachments(Array.from(list))
        e.currentTarget.value = ""
      }}
    />
  )

  const variants = createMemo(() => ["default", ...props.controls.model.selection.variant.list()])
  // Check provider variants directly: `variants` also includes the UI-only default option.
  const showVariantControl = createMemo(() => props.controls.model.selection.variant.list().length > 0)
  const accepting = createMemo(() => {
    const id = props.controls.session.id
    if (!id) return permission.isAutoAcceptingDirectory(sdk().directory)
    return permission.isAutoAccepting(id, sdk().directory)
  })

  const { abort, handleSubmit } =
    props.submission ??
    createPromptSubmit({
      prompt,
      info,
      imageAttachments,
      commentCount,
      autoAccept: () => accepting(),
      mode: () => store.mode,
      working,
      editor: () => editorRef,
      queueScroll,
      promptLength,
      addToHistory,
      resetHistoryNavigation: () => {
        resetHistoryNavigation(true)
      },
      setMode: (mode) => setStore("mode", mode),
      setPopover: (popover) => setStore("popover", popover),
      newSessionWorktree: () => props.newSessionWorktree,
      onNewSessionWorktreeReset: props.onNewSessionWorktreeReset,
      shouldQueue: props.shouldQueue,
      onQueue: props.onQueue,
      onAbort: props.onAbort,
      onSubmit: props.onSubmit,
    })

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "u") {
      event.preventDefault()
      if (store.mode !== "normal") return
      pick()
      return
    }

    if (event.key === "Backspace") {
      const selection = window.getSelection()
      if (selection && selection.isCollapsed) {
        const node = selection.anchorNode
        const offset = selection.anchorOffset
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ?? ""
          if (/^\u200B+$/.test(text) && offset > 0) {
            const range = document.createRange()
            range.setStart(node, 0)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }
    }

    if (event.key === "!" && store.mode === "normal") {
      const cursorPosition = getCursorPosition(editorRef)
      if (cursorPosition === 0) {
        setStore("mode", "shell")
        setStore("popover", null)
        event.preventDefault()
        return
      }
    }

    if (event.key === "Escape") {
      if (store.popover) {
        closePopover()
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (store.mode === "shell") {
        setStore("mode", "normal")
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (working()) {
        void abort()
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (escBlur()) {
        editorRef.blur()
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }

    if (store.mode === "shell") {
      const { collapsed, cursorPosition, textLength } = getCaretState()
      if (event.key === "Backspace" && collapsed && cursorPosition === 0 && textLength === 0) {
        setStore("mode", "normal")
        event.preventDefault()
        return
      }
    }

    // Handle Shift+Enter BEFORE IME check - Shift+Enter is never used for IME input
    // and should always insert a newline regardless of composition state
    if (event.key === "Enter" && event.shiftKey) {
      addPart({ type: "text", content: "\n", start: 0, end: 0 })
      event.preventDefault()
      return
    }

    if (event.key === "Enter" && isImeComposing(event)) {
      return
    }

    const ctrl = event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey

    if (store.popover) {
      if (event.key === "Tab") {
        selectPopoverActive()
        event.preventDefault()
        return
      }
      const nav = event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter"
      const ctrlNav = ctrl && (event.key === "n" || event.key === "p")
      if (nav || ctrlNav) {
        if (store.popover === "at") {
          atOnKeyDown(event)
          event.preventDefault()
          return
        }
        if (store.popover === "slash") {
          slashOnKeyDown(event)
        }
        event.preventDefault()
        return
      }
    }

    if (ctrl && event.code === "KeyG") {
      if (store.popover) {
        closePopover()
        event.preventDefault()
        return
      }
      if (working()) {
        void abort()
        event.preventDefault()
      }
      return
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const { collapsed } = getCaretState()
      if (!collapsed) return

      const cursorPosition = getCursorPosition(editorRef)
      const textContent = prompt
        .current()
        .map((part) => ("content" in part ? part.content : ""))
        .join("")
      const direction = event.key === "ArrowUp" ? "up" : "down"
      if (!canNavigateHistoryAtCursor(direction, textContent, cursorPosition, store.historyIndex >= 0)) return
      if (navigateHistory(direction)) {
        event.preventDefault()
      }
      return
    }

    // Note: Shift+Enter is handled earlier, before IME check
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (event.repeat) return
      if (
        working() &&
        prompt
          .current()
          .map((part) => ("content" in part ? part.content : ""))
          .join("")
          .trim().length === 0 &&
        imageAttachments().length === 0 &&
        commentCount() === 0
      ) {
        return
      }
      void handleSubmit(event)
    }
  }

  const agentsLoading = () => props.controls.agents.loading
  const agentsShouldFadeIn = createMemo((prev) => prev ?? agentsLoading())
  const providersLoading = () => props.controls.model.loading
  const providersShouldFadeIn = createMemo((prev) => prev ?? providersLoading())

  const [promptReady] = createResource(
    () => prompt.ready().promise,
    (p) => p,
  )

  const designPlaceholder = () => {
    if (store.mode === "shell") return placeholder()
    return "Ask anything, / for commands, @ for context..."
  }

  const modelControlState = createMemo<ComposerModelControlState>(() => ({
    loading: providersLoading(),
    paid: props.controls.model.paid,
    title: language.t("command.model.choose"),
    keybind: command.keybind("model.choose"),
    model: props.controls.model.selection,
    providerID: props.controls.model.selection.current()?.provider?.id,
    modelName: props.controls.model.selection.current()?.name ?? language.t("dialog.model.select.title"),
    style: control(),
    onClose: restoreFocus,
    onUnpaidClick: () => {
      void import("@/components/dialog-select-model-unpaid").then((x) => {
        dialog.show(() => <x.DialogSelectModelUnpaid model={props.controls.model.selection} />)
      })
    },
  }))

  const newSession = () => props.variant === "new-session"
  const projects = createMemo(() => props.controls.projects.available)
  const projectForDirectory = (directory: string | undefined) => {
    if (!directory) return
    const key = pathKey(directory)
    return projects().find(
      (project) => pathKey(project.worktree) === key || project.sandboxes?.some((sandbox) => pathKey(sandbox) === key),
    )
  }
  const selectedProject = createMemo(() => projectForDirectory(props.controls.projects.directory))
  const projectResults = createMemo(() => {
    const search = picker.projectSearch.trim().toLowerCase()
    if (!search) return projects()
    return projects().filter((project) => displayName(project).toLowerCase().includes(search))
  })
  const showAgentControl = createMemo(() => props.controls.agents.visible && props.controls.agents.options.length > 0)
  const selectProject = (worktree: string) => {
    setPicker({
      projectOpen: false,
      projectSearch: "",
    })
    if (pathKey(worktree) === pathKey(selectedProject()?.worktree ?? "")) {
      restoreFocus()
      return
    }
    props.controls.projects.select(worktree)
    restoreFocus()
  }
  const addProject = () => {
    props.controls.projects.add(language.t("command.project.open"))
  }

  const projectPickerState = createMemo<ComposerPickerState>(() => ({
    open: picker.projectOpen,
    trigger: {
      action: "prompt-project",
      icon: "folder",
      label: selectedProject() ? displayName(selectedProject()!) : language.t("session.new.project.new"),
      class: "max-w-[203px]",
      style: control(),
      onPress: () => setPicker("projectOpen", true),
    },
    search: picker.projectSearch,
    searchPlaceholder: language.t("session.new.project.search"),
    clearLabel: language.t("common.clear"),
    items: projectResults().map((project) => ({
      icon: "folder",
      label: displayName(project),
      selected: selectedProject()?.worktree === project.worktree,
      onSelect: () => selectProject(project.worktree),
    })),
    action: {
      icon: "plus",
      label: language.t("session.new.project.add"),
      onSelect: () => {
        setPicker("projectOpen", false)
        void addProject()
      },
    },
    onOpenChange: (open) => {
      setPicker("projectOpen", open)
      if (open) requestAnimationFrame(() => projectSearchRef?.focus())
    },
    onSearchInput: (value) => setPicker("projectSearch", value),
    onSearchClear: () => setPicker("projectSearch", ""),
    searchRef: (el) => (projectSearchRef = el),
  }))
  const agentControlState = createMemo<ComposerAgentControlState>(() => ({
    title: language.t("command.agent.cycle"),
    keybind: command.keybind("agent.cycle"),
    options: props.controls.agents.options,
    current: props.controls.agents.current,
    style: control(),
    onSelect: (value) => {
      props.controls.agents.select(value)
      restoreFocus()
    },
  }))
  const newProjectTriggerState = createMemo<ComposerPickerTriggerState>(() => ({
    action: "prompt-project",
    icon: "folder-add-left",
    label: language.t("session.new.project.new"),
    class: "max-w-[160px]",
    style: control(),
    onPress: () => void addProject(),
  }))

  return (
    <div class="relative size-full flex flex-col gap-0">
      {(promptReady(), null)}
      <PromptPopover
        popover={store.popover}
        setSlashPopoverRef={(el) => (slashPopoverRef = el)}
        atFlat={atFlat()}
        atActive={atActive() ?? undefined}
        atKey={atKey}
        setAtActive={setAtActive}
        onAtSelect={handleAtSelect}
        slashFlat={slashFlat()}
        slashActive={slashActive() ?? undefined}
        setSlashActive={setSlashActive}
        onSlashSelect={handleSlashSelect}
        commandKeybind={command.keybind}
        t={(key) => language.t(key as Parameters<typeof language.t>[0])}
      />
      <Switch>
        <Match when={props.controls.newLayoutDesigns}>
          <div class="flex flex-col gap-3">
            <DockShellForm
              data-component={newSession() ? "session-new-composer" : "session-composer"}
              onSubmit={handleSubmit}
              classList={{
                "group/prompt-input min-h-[96px] w-full rounded-xl bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]": true,
                "border-icon-info-active border-dashed": store.draggingType !== null,
                [props.class ?? ""]: !!props.class,
              }}
            >
              <PromptDragOverlay
                type={store.draggingType}
                label={language.t(
                  store.draggingType === "@mention" ? "prompt.dropzone.file.label" : "prompt.dropzone.label",
                )}
              />
              <PromptContextItems
                items={contextItems()}
                active={(item) => {
                  const active = comments.active()
                  return !!item.commentID && item.commentID === active?.id && item.path === active?.file
                }}
                openComment={openComment}
                remove={(item) => {
                  if (item.commentID) comments.remove(item.path, item.commentID)
                  prompt.context.remove(item.key)
                }}
                t={(key) => language.t(key as Parameters<typeof language.t>[0])}
              />
              <PromptImageAttachments
                attachments={imageAttachments()}
                onOpen={(attachment) =>
                  dialog.show(() => <ImagePreview src={attachment.dataUrl} alt={attachment.filename} />)
                }
                onRemove={removeAttachment}
                removeLabel={language.t("prompt.attachment.remove")}
              />
              <div
                class="relative min-h-[52px]"
                onMouseDown={(e) => {
                  const target = e.target
                  if (!(target instanceof HTMLElement)) return
                  if (target.closest('[data-action^="prompt-"]')) return
                  editorRef?.focus()
                }}
              >
                <div class="relative max-h-[180px] overflow-y-auto no-scrollbar" ref={(el) => (scrollRef = el)}>
                  <div
                    data-component="prompt-input"
                    ref={(el) => {
                      editorRef = el
                      props.ref?.(el)
                    }}
                    role="textbox"
                    aria-multiline="true"
                    aria-label={designPlaceholder()}
                    contenteditable="true"
                    autocapitalize={store.mode === "normal" ? "sentences" : "off"}
                    autocorrect={store.mode === "normal" ? "on" : "off"}
                    spellcheck={store.mode === "normal"}
                    inputMode="text"
                    // @ts-expect-error
                    autocomplete="off"
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    classList={{
                      "select-text": true,
                      "min-h-[52px] w-full px-4 pt-4 pb-2 focus:outline-none whitespace-pre-wrap leading-5 text-[13px] font-[440] text-v2-text-text-base": true,
                      "[&_[data-type=file]]:text-syntax-property": true,
                      "[&_[data-type=agent]]:text-syntax-type": true,
                      "font-mono!": store.mode === "shell",
                    }}
                  />
                  <div
                    data-component={newSession() ? "session-new-design-text" : "session-composer-text"}
                    class="absolute top-0 inset-x-0 px-4 pt-4 pointer-events-none whitespace-nowrap truncate leading-5 text-[13px] font-[440] text-v2-text-text-faint [font-family:Inter,var(--font-family-sans)]"
                    classList={{ "font-mono!": store.mode === "shell", hidden: prompt.dirty() }}
                  >
                    {designPlaceholder()}
                  </div>
                </div>
              </div>
              <div class="flex h-11 items-center px-2">
                <div class="flex min-w-0 flex-1 items-center gap-0">
                  {fileAttachmentInput()}
                  <TooltipKeybind
                    placement="top"
                    title={language.t("prompt.action.attachFile")}
                    keybind={command.keybind("file.attach")}
                  >
                    <IconButton
                      data-action="prompt-attach"
                      type="button"
                      icon="plus"
                      variant="ghost"
                      class="size-7 rounded-md p-[6px] text-v2-icon-icon-muted"
                      style={buttons()}
                      onClick={pick}
                      disabled={store.mode !== "normal"}
                      tabIndex={store.mode === "normal" ? undefined : -1}
                      aria-label={language.t("prompt.action.attachFile")}
                    />
                  </TooltipKeybind>
                  <Show when={showAgentControl()}>
                    <ComposerAgentControl state={agentControlState()} />
                  </Show>
                  <Show when={newSession() && !selectedProject()}>
                    <ComposerPickerTrigger state={newProjectTriggerState()} />
                  </Show>
                  <ComposerModelControl state={modelControlState()} />
                  <Show when={store.mode !== "shell" && showVariantControl()}>
                    <div
                      data-component="prompt-variant-control"
                      classList={{
                        "hidden group-hover/prompt-input:block group-focus-within/prompt-input:block":
                          !props.controls.model.selection.variant.current() && !store.variantOpen,
                      }}
                    >
                      <TooltipKeybind
                        placement="top"
                        gutter={4}
                        title={language.t("command.model.variant.cycle")}
                        keybind={command.keybind("model.variant.cycle")}
                      >
                        <Select
                          size="small"
                          options={variants()}
                          current={props.controls.model.selection.variant.current() ?? "default"}
                          label={(x) => (x === "default" ? language.t("common.default") : x)}
                          onOpenChange={(open) => setStore("variantOpen", open)}
                          onSelect={(value) => {
                            props.controls.model.selection.variant.set(value === "default" ? undefined : value)
                            restoreFocus()
                          }}
                          class="capitalize max-w-[120px] justify-start text-v2-text-text-faint"
                          valueClass="truncate text-[11px] font-[440] leading-4 text-v2-text-text-faint"
                          triggerStyle={control()}
                          triggerProps={{ "data-action": "prompt-model-variant" }}
                          variant="ghost"
                        />
                      </TooltipKeybind>
                    </div>
                  </Show>
                </div>
                <div class="flex items-center gap-[2px]">
                  <Tooltip
                    placement="top"
                    value={
                      voiceCapability() === "unavailable"
                        ? "Voice input unavailable — enable microphone permissions"
                        : voiceCapability() === "checking"
                          ? "Checking microphone..."
                          : isTranscribing()
                            ? "Transcribing..."
                            : isListening()
                              ? "Stop Listening"
                              : "Voice to Text"
                    }
                  >
                    <IconButton
                      data-action="prompt-voice"
                      type="button"
                      disabled={isTranscribing() || voiceCapability() !== "available"}
                      icon={isTranscribing() ? "reset" : isListening() ? "stop" : "microphone"}
                      variant={isListening() ? "primary" : "ghost"}
                      class={`size-7 rounded-md p-[6px] text-v2-icon-icon-muted${isListening() ? " animate-pulse" : ""}${isTranscribing() ? " animate-spin" : ""}${voiceCapability() === "unavailable" ? " opacity-40" : ""}`}
                      onClick={toggleListening}
                      aria-label="Voice Input"
                    />
                  </Tooltip>
                  <Tooltip placement="top" inactive={!working() && blank()} value={tip()}>
                    <IconButton
                      data-action="prompt-submit"
                      type="submit"
                      disabled={!working() && blank()}
                      tabIndex={store.mode === "normal" ? undefined : -1}
                      icon={stopping() ? "stop" : store.mode === "shell" ? "arrow-undo-down" : "arrow-up"}
                      variant="primary"
                      class="size-7 rounded-md p-[6px] text-v2-icon-icon-muted shadow-[var(--v2-elevation-button-contrast)] disabled:opacity-50"
                      style={{
                        "background-image":
                          "linear-gradient(180deg,var(--v2-alpha-light-20) 0%,var(--v2-alpha-light-0) 100%),linear-gradient(90deg,var(--v2-background-bg-contrast) 0%,var(--v2-background-bg-contrast) 100%)",
                      }}
                      aria-label={stopping() ? language.t("prompt.action.stop") : language.t("prompt.action.send")}
                    />
                  </Tooltip>
                </div>
              </div>
            </DockShellForm>
            <Show when={newSession() && selectedProject()}>
              <div class="flex h-7 min-w-0 items-center gap-0 px-2">
                <ComposerPicker state={projectPickerState()} />
              </div>
            </Show>
          </div>
        </Match>
        <Match when>
          <DockShellForm
            onSubmit={handleSubmit}
            classList={{
              "group/prompt-input": true,
              "focus-within:shadow-xs-border": true,
              "border-icon-info-active border-dashed": store.draggingType !== null,
              [props.class ?? ""]: !!props.class,
            }}
          >
            <PromptDragOverlay
              type={store.draggingType}
              label={language.t(
                store.draggingType === "@mention" ? "prompt.dropzone.file.label" : "prompt.dropzone.label",
              )}
            />
            <PromptContextItems
              items={contextItems()}
              active={(item) => {
                const active = comments.active()
                return !!item.commentID && item.commentID === active?.id && item.path === active?.file
              }}
              openComment={openComment}
              remove={(item) => {
                if (item.commentID) comments.remove(item.path, item.commentID)
                prompt.context.remove(item.key)
              }}
              t={(key) => language.t(key as Parameters<typeof language.t>[0])}
            />
            <PromptImageAttachments
              attachments={imageAttachments()}
              onOpen={(attachment) =>
                dialog.show(() => <ImagePreview src={attachment.dataUrl} alt={attachment.filename} />)
              }
              onRemove={removeAttachment}
              removeLabel={language.t("prompt.attachment.remove")}
            />
            <div
              class="relative"
              onMouseDown={(e) => {
                const target = e.target
                if (!(target instanceof HTMLElement)) return
                if (target.closest('[data-action="prompt-attach"], [data-action="prompt-submit"], [data-action="prompt-voice"]')) {
                  return
                }
                editorRef?.focus()
              }}
            >
              <div
                class="relative max-h-[240px] overflow-y-auto no-scrollbar"
                ref={(el) => (scrollRef = el)}
                style={{ "scroll-padding-bottom": space }}
              >
                <div
                  data-component="prompt-input"
                  ref={(el) => {
                    editorRef = el
                    props.ref?.(el)
                  }}
                  role="textbox"
                  aria-multiline="true"
                  aria-label={placeholder()}
                  contenteditable="true"
                  autocapitalize={store.mode === "normal" ? "sentences" : "off"}
                  autocorrect={store.mode === "normal" ? "on" : "off"}
                  spellcheck={store.mode === "normal"}
                  inputMode="text"
                  // @ts-expect-error
                  autocomplete="off"
                  onInput={handleInput}
                  onPaste={handlePaste}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  classList={{
                    "select-text": true,
                    "w-full pl-3 pr-2 pt-2 text-14-regular text-text-strong focus:outline-none whitespace-pre-wrap": true,
                    "[&_[data-type=file]]:text-syntax-property": true,
                    "[&_[data-type=agent]]:text-syntax-type": true,
                    "font-mono!": store.mode === "shell",
                  }}
                  style={{ "padding-bottom": space }}
                />
                <div
                  class="absolute top-0 inset-x-0 pl-3 pr-2 pt-2 text-14-regular text-text-weak pointer-events-none whitespace-nowrap truncate"
                  classList={{ "font-mono!": store.mode === "shell" }}
                  style={{ "padding-bottom": space, display: prompt.dirty() ? "none" : undefined }}
                >
                  {placeholder()}
                </div>
              </div>

              <div
                aria-hidden="true"
                class="pointer-events-none absolute inset-x-0 bottom-0"
                style={{
                  height: space,
                  background:
                    "linear-gradient(to top, var(--surface-raised-stronger-non-alpha) calc(100% - 20px), transparent)",
                }}
              />

              <div class="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2 z-10">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES.join(",")}
                  class="hidden"
                  onChange={(e) => {
                    const list = e.currentTarget.files
                    if (list) void addAttachments(Array.from(list))
                    e.currentTarget.value = ""
                  }}
                />

                <div class="flex items-center gap-[2px] pointer-events-auto">
                  <Tooltip
                    placement="top"
                    value={
                      voiceCapability() === "unavailable"
                        ? "Voice input unavailable — enable microphone permissions"
                        : voiceCapability() === "checking"
                          ? "Checking microphone..."
                          : isTranscribing()
                            ? "Transcribing..."
                            : isListening()
                              ? "Stop Listening"
                              : "Voice to Text"
                    }
                  >
                    <IconButton
                      data-action="prompt-voice"
                      type="button"
                      disabled={isTranscribing() || voiceCapability() !== "available"}
                      icon={isTranscribing() ? "reset" : isListening() ? "stop" : "microphone"}
                      variant={isListening() ? "primary" : "ghost"}
                      class={`size-8 ${isListening() ? "text-red-500 animate-pulse" : ""}${isTranscribing() ? "animate-spin" : ""}${voiceCapability() === "unavailable" ? " opacity-40" : ""}`}
                      onClick={toggleListening}
                      aria-label="Voice Input"
                    />
                  </Tooltip>
                  <Tooltip placement="top" inactive={!working() && blank()} value={tip()}>
                    <IconButton
                      data-action="prompt-submit"
                      type="submit"
                      disabled={!working() && blank()}
                      tabIndex={store.mode === "normal" ? undefined : -1}
                      icon={stopping() ? "stop" : store.mode === "shell" ? "arrow-undo-down" : "arrow-up"}
                      variant="primary"
                      class="size-8"
                      aria-label={stopping() ? language.t("prompt.action.stop") : language.t("prompt.action.send")}
                    />
                  </Tooltip>
                </div>
              </div>

              <div class="pointer-events-none absolute bottom-2 left-2">
                <div
                  aria-hidden={store.mode !== "normal"}
                  class="pointer-events-auto"
                  style={{
                    "pointer-events": buttonsSpring() > 0.5 ? "auto" : "none",
                  }}
                >
                  <TooltipKeybind
                    placement="top"
                    title={language.t("prompt.action.attachFile")}
                    keybind={command.keybind("file.attach")}
                  >
                    <Button
                      data-action="prompt-attach"
                      type="button"
                      variant="ghost"
                      class="size-8 p-0"
                      style={buttons()}
                      onClick={pick}
                      disabled={store.mode !== "normal"}
                      tabIndex={store.mode === "normal" ? undefined : -1}
                      aria-label={language.t("prompt.action.attachFile")}
                    >
                      <Icon name="plus" class="size-4.5" />
                    </Button>
                  </TooltipKeybind>
                </div>
              </div>
            </div>
          </DockShellForm>
          <Show when={store.mode === "normal" || store.mode === "shell"}>
            <DockTray attach="top">
              <div class="px-1.75 pt-5.5 pb-2 flex items-center gap-2 min-w-0">
                <div class="flex items-center gap-1.5 min-w-0 flex-1 relative">
                  <div
                    class="h-7 flex items-center gap-1.5 min-w-0 absolute inset-0"
                    style={{
                      padding: "0 0px 0 8px",
                      ...shell(),
                    }}
                  >
                    <Icon name="console" />
                    <span class="truncate text-13-medium text-text-base">{language.t("prompt.mode.shell")}</span>
                    <div class="flex-1" />
                    <Button
                      variant="ghost"
                      class="text-text-base"
                      onClick={() => {
                        setStore("mode", "normal")
                      }}
                    >
                      {language.t("common.cancel")}
                    </Button>
                  </div>
                  <div class="flex items-center gap-1.5 min-w-0 flex-1 h-7">
                    <Show when={!agentsLoading()}>
                      <div
                        data-component="prompt-agent-control"
                        style={agentsShouldFadeIn() ? { animation: "fade-in 0.3s" } : undefined}
                      >
                        <TooltipKeybind
                          placement="top"
                          gutter={4}
                          title={language.t("command.agent.cycle")}
                          keybind={command.keybind("agent.cycle")}
                        >
                          <Select
                            size="normal"
                            options={props.controls.agents.options}
                            current={props.controls.agents.current}
                            onSelect={(value) => {
                              props.controls.agents.select(value)
                              restoreFocus()
                            }}
                            class="capitalize max-w-[160px] text-text-base"
                            valueClass="truncate text-13-regular text-text-base"
                            triggerStyle={control()}
                            triggerProps={{ "data-action": "prompt-agent" }}
                            variant="ghost"
                          />
                        </TooltipKeybind>
                      </div>
                    </Show>
                    <Show when={!providersLoading()}>
                      <Show when={store.mode !== "shell"}>
                        <div
                          data-component="prompt-model-control"
                          style={providersShouldFadeIn() ? { animation: "fade-in 0.3s" } : undefined}
                        >
                          <Show
                            when={props.controls.model.paid}
                            fallback={
                              <TooltipKeybind
                                placement="top"
                                gutter={4}
                                title={language.t("command.model.choose")}
                                keybind={command.keybind("model.choose")}
                              >
                                <Button
                                  data-action="prompt-model"
                                  as="div"
                                  variant="ghost"
                                  size="normal"
                                  class="min-w-0 max-w-[320px] text-13-regular text-text-base group"
                                  style={control()}
                                  onClick={() => {
                                    void import("@/components/dialog-select-model-unpaid").then((x) => {
                                      dialog.show(() => (
                                        <x.DialogSelectModelUnpaid model={props.controls.model.selection} />
                                      ))
                                    })
                                  }}
                                >
                                  <Show when={props.controls.model.selection.current()?.provider?.id}>
                                    <ProviderIcon
                                      id={props.controls.model.selection.current()?.provider?.id ?? ""}
                                      class="size-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-150"
                                      style={{ "will-change": "opacity", transform: "translateZ(0)" }}
                                    />
                                  </Show>
                                  <span class="truncate">
                                    {props.controls.model.selection.current()?.name ??
                                      language.t("dialog.model.select.title")}
                                  </span>
                                  <Icon name="chevron-down" size="small" class="shrink-0" />
                                </Button>
                              </TooltipKeybind>
                            }
                          >
                            <TooltipKeybind
                              placement="top"
                              gutter={4}
                              title={language.t("command.model.choose")}
                              keybind={command.keybind("model.choose")}
                            >
                              <ModelSelectorPopover
                                model={props.controls.model.selection}
                                triggerAs={Button}
                                triggerProps={{
                                  variant: "ghost",
                                  size: "normal",
                                  style: control(),
                                  class: "min-w-0 max-w-[320px] text-13-regular text-text-base group",
                                  "data-action": "prompt-model",
                                }}
                                onClose={restoreFocus}
                              >
                                <Show when={props.controls.model.selection.current()?.provider?.id}>
                                  <ProviderIcon
                                    id={props.controls.model.selection.current()?.provider?.id ?? ""}
                                    class="size-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-150"
                                    style={{ "will-change": "opacity", transform: "translateZ(0)" }}
                                  />
                                </Show>
                                <span class="truncate">
                                  {props.controls.model.selection.current()?.name ??
                                    language.t("dialog.model.select.title")}
                                </span>
                                <Icon name="chevron-down" size="small" class="shrink-0" />
                              </ModelSelectorPopover>
                            </TooltipKeybind>
                          </Show>
                        </div>
                        <Show when={showVariantControl()}>
                          <div
                            data-component="prompt-variant-control"
                            style={providersShouldFadeIn() ? { animation: "fade-in 0.3s" } : undefined}
                          >
                            <TooltipKeybind
                              placement="top"
                              gutter={4}
                              title={language.t("command.model.variant.cycle")}
                              keybind={command.keybind("model.variant.cycle")}
                            >
                              <Select
                                size="normal"
                                options={variants()}
                                current={props.controls.model.selection.variant.current() ?? "default"}
                                label={(x) => (x === "default" ? language.t("common.default") : x)}
                                onSelect={(value) => {
                                  props.controls.model.selection.variant.set(value === "default" ? undefined : value)
                                  restoreFocus()
                                }}
                                class="capitalize max-w-[160px] text-text-base"
                                valueClass="truncate text-13-regular text-text-base"
                                triggerStyle={control()}
                                triggerProps={{ "data-action": "prompt-model-variant" }}
                                variant="ghost"
                              />
                            </TooltipKeybind>
                          </div>
                        </Show>
                      </Show>
                    </Show>
                    <TooltipKeybind
                      placement="top"
                      gutter={4}
                      title={language.t("command.terminal.toggle")}
                      keybind={command.keybind("terminal.toggle")}
                    >
                      <Button
                        data-action="prompt-terminal"
                        variant="ghost"
                        class="size-7 p-0 box-border shrink-0"
                        onClick={() => {
                          layout.bottomPanel.toggle("terminal")
                        }}
                        aria-label={language.t("command.terminal.toggle")}
                        aria-expanded={layout.bottomPanel.opened()}
                        aria-controls="bottom-panel"
                      >
                        <Icon name={layout.bottomPanel.opened() ? "terminal-active" : "developer_mode"} />
                      </Button>
                    </TooltipKeybind>
                  </div>
                </div>
              </div>
            </DockTray>
          </Show>
        </Match>
      </Switch>
    </div>
  )
}

type ComposerPickerItemState = {
  icon: IconProps["name"]
  label: string
  selected?: boolean
  onSelect: () => void
}

type ComposerPickerTriggerState = {
  action: string
  icon?: IconProps["name"]
  label: string
  class?: string
  style: JSX.CSSProperties | undefined
  onPress: () => void
}

type ComposerPickerState = {
  open: boolean
  trigger: ComposerPickerTriggerState
  search: string
  searchPlaceholder: string
  clearLabel: string
  items: ComposerPickerItemState[]
  action: ComposerPickerItemState
  listClass?: string
  searchRef: (el: HTMLInputElement) => void
  onOpenChange: (open: boolean) => void
  onSearchInput: (value: string) => void
  onSearchClear: () => void
}

type ComposerAgentControlState = {
  title: string
  keybind: string
  options: string[]
  current: string
  style: JSX.CSSProperties | undefined
  onSelect: (value: string | undefined) => void
}

type ComposerModelControlState = {
  loading: boolean
  paid: boolean
  title: string
  keybind: string
  model: ReturnType<typeof useLocal>["model"]
  providerID?: string
  modelName: string
  style: JSX.CSSProperties | undefined
  onClose: () => void
  onUnpaidClick: () => void
}

function ComposerPickerTrigger(props: ComponentProps<"button"> & { state: ComposerPickerTriggerState }) {
  const [local, rest] = splitProps(props, ["state", "class", "style", "onClick"])
  return (
    <button
      {...rest}
      data-action={local.state.action}
      type="button"
      class={`flex h-7 min-w-0 items-center gap-1.5 rounded px-2 text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-faint transition-colors hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none ${local.state.class ?? ""}`}
      style={local.state.style}
      onClick={() => local.state.onPress()}
    >
      <Show when={local.state.icon}>
        {(icon) => <Icon name={icon()} size="small" class="shrink-0 text-v2-icon-icon-muted" />}
      </Show>
      <span class="min-w-0 truncate leading-5">{local.state.label}</span>
      <Icon name="chevron-down" size="small" class="shrink-0 text-v2-icon-icon-muted" />
    </button>
  )
}

function ComposerPickerMenuItem(props: { state: ComposerPickerItemState }) {
  return (
    <button
      type="button"
      class="flex h-7 w-full items-center gap-2 rounded px-3 text-left text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none"
      onClick={props.state.onSelect}
    >
      <Icon name={props.state.icon} size="small" class="shrink-0 text-v2-icon-icon-base" />
      <span class="min-w-0 flex-1 truncate leading-5">{props.state.label}</span>
      <Show when={props.state.selected}>
        <Icon name="check-small" size="small" class="shrink-0 text-v2-icon-icon-base" />
      </Show>
    </button>
  )
}

function ComposerPicker(props: { state: ComposerPickerState }) {
  return (
    <KobaltePopover
      open={props.state.open}
      placement="bottom-start"
      gutter={4}
      modal={false}
      onOpenChange={props.state.onOpenChange}
    >
      <KobaltePopover.Trigger as={ComposerPickerTrigger} state={props.state.trigger} />
      <KobaltePopover.Portal>
        <KobaltePopover.Content
          class="w-[243px] overflow-hidden rounded-md bg-v2-background-bg-layer-01 shadow-[var(--v2-elevation-floating)] focus:outline-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div class={`flex flex-col p-0.5 ${props.state.listClass ?? ""}`}>
            <div class="flex h-7 items-center gap-2 rounded px-3 text-v2-icon-icon-muted">
              <Icon name="magnifying-glass" size="small" class="shrink-0" />
              <input
                ref={props.state.searchRef}
                value={props.state.search}
                placeholder={props.state.searchPlaceholder}
                class="h-7 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-base outline-none placeholder:text-v2-text-text-faint"
                onInput={(event) => props.state.onSearchInput(event.currentTarget.value)}
              />
              <Show when={props.state.search.trim()}>
                <button
                  type="button"
                  class="flex size-5 items-center justify-center rounded text-v2-icon-icon-muted hover:bg-v2-overlay-simple-overlay-hover"
                  onClick={props.state.onSearchClear}
                  aria-label={props.state.clearLabel}
                >
                  <Icon name="close-small" size="small" />
                </button>
              </Show>
            </div>
            <For each={props.state.items}>{(item) => <ComposerPickerMenuItem state={item} />}</For>
          </div>
          <div class="h-px bg-v2-border-border-muted" />
          <div class="flex flex-col p-0.5">
            <ComposerPickerMenuItem state={props.state.action} />
          </div>
        </KobaltePopover.Content>
      </KobaltePopover.Portal>
    </KobaltePopover>
  )
}

function ComposerAgentControl(props: { state: ComposerAgentControlState }) {
  return (
    <div class="relative">
      <div class="pointer-events-none absolute left-2 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center text-v2-icon-icon-muted">
        <Icon name="sliders" size="small" />
      </div>
      <TooltipKeybind placement="top" gutter={4} title={props.state.title} keybind={props.state.keybind}>
        <Select
          size="normal"
          options={props.state.options}
          current={props.state.current}
          onSelect={props.state.onSelect}
          class="max-w-[175px] justify-start text-v2-text-text-faint [&_[data-component=icon]]:text-v2-icon-icon-muted"
          valueClass="truncate pl-5 text-[13px] font-[440] leading-5 text-v2-text-text-faint"
          triggerStyle={props.state.style}
          triggerProps={{ "data-action": "prompt-agent" }}
          variant="ghost"
        />
      </TooltipKeybind>
    </div>
  )
}

function ComposerModelControl(props: { state: ComposerModelControlState }) {
  return (
    <Show when={!props.state.loading}>
      <Show
        when={props.state.paid}
        fallback={
          <TooltipKeybind placement="top" gutter={4} title={props.state.title} keybind={props.state.keybind}>
            <Button
              data-action="prompt-model"
              as="div"
              variant="ghost"
              size="normal"
              class="min-w-0 max-w-[220px] justify-start text-[13px] font-[440] leading-5 text-v2-text-text-faint group"
              style={props.state.style}
              onClick={props.state.onUnpaidClick}
            >
              <Show when={props.state.providerID}>
                {(providerID) => (
                  <ProviderIcon
                    id={providerID()}
                    class="size-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ "will-change": "opacity", transform: "translateZ(0)" }}
                  />
                )}
              </Show>
              <span class="truncate">{props.state.modelName}</span>
              <Icon name="chevron-down" size="small" class="shrink-0 text-v2-icon-icon-muted" />
            </Button>
          </TooltipKeybind>
        }
      >
        <TooltipKeybind placement="top" gutter={4} title={props.state.title} keybind={props.state.keybind}>
          <ModelSelectorPopover
            model={props.state.model}
            triggerAs={Button}
            triggerProps={{
              variant: "ghost",
              size: "normal",
              style: props.state.style,
              class:
                "min-w-0 max-w-[220px] justify-start text-[13px] font-[440] leading-5 text-v2-text-text-faint group",
              "data-action": "prompt-model",
            }}
            onClose={props.state.onClose}
          >
            <Show when={props.state.providerID}>
              {(providerID) => (
                <ProviderIcon
                  id={providerID()}
                  class="size-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ "will-change": "opacity", transform: "translateZ(0)" }}
                />
              )}
            </Show>
            <span class="truncate">{props.state.modelName}</span>
            <Icon name="chevron-down" size="small" class="shrink-0 text-v2-icon-icon-muted" />
          </ModelSelectorPopover>
        </TooltipKeybind>
      </Show>
    </Show>
  )
}

function encodeWAV(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 16000 * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, "data")
  view.setUint32(40, samples.length * 2, true)

  floatTo16BitPCM(view, 44, samples)

  return new Blob([view], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

// Script ranges for detecting misidentified language output
const DEVANAGARI_RE = /[\u0900-\u097F]/
// CJK: Chinese, Japanese Kanji, Korean Hangul, and other East Asian scripts
const CJK_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\uFF00-\uFFEF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/
// Arabic script covers Urdu, Arabic, Persian, etc.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
// Thai, Lao, Myanmar etc. — also commonly confused with Devanagari by small models
const OTHER_ASIAN_RE = /[\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F]/

/**
 * When the user has selected Nepali (ne), check if the transcription output
 * is in a completely wrong script (Chinese/CJK, Korean, Arabic/Urdu, Thai etc.).
 * Returns empty string to discard hallucinated output silently.
 */
function validateTranscriptScript(text: string, languageCode: string): string {
  if (!text || !languageCode || languageCode === "auto") return text
  if (languageCode !== "ne" && languageCode !== "hi") return text

  const chars = [...text.trim()]
  if (chars.length === 0) return text

  const cjkCount = chars.filter((c) => CJK_RE.test(c)).length
  const arabicCount = chars.filter((c) => ARABIC_RE.test(c)).length
  const otherAsianCount = chars.filter((c) => OTHER_ASIAN_RE.test(c)).length
  const devanagariCount = chars.filter((c) => DEVANAGARI_RE.test(c)).length
  const wrongScript = cjkCount + arabicCount + otherAsianCount

  // If more than 20% of characters are wrong-script and almost no Devanagari, reject
  if (wrongScript / chars.length > 0.2 && devanagariCount < 2) {
    console.warn(
      `[VOICE] Script mismatch detected for language "${languageCode}". ` +
      `CJK/Korean: ${cjkCount}, Arabic/Urdu: ${arabicCount}, Thai/Other: ${otherAsianCount}, Devanagari: ${devanagariCount}. ` +
      `Discarding hallucinated output: "${text.slice(0, 60)}"`
    )
    return ""
  }
  return text
}

async function transcribeWithOpenAI(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", wavBlob, "recording.wav")
  formData.append("model", "whisper-1")
  if (languageCode && languageCode !== "auto") {
    formData.append("language", languageCode)
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[OPENAI_SPEECH] API error response:", errorText)
    throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}

const geminiLanguagePromptMap: Record<string, string> = {
  ne: "The audio is in Nepali. Transcribe it exactly as spoken in Nepali Devanagari script (नेपाली देवनागरी लिपिमा). Do not transliterate into Roman letters. Do not translate into English.",
  hi: "The audio is in Hindi. Transcribe it exactly as spoken in Hindi Devanagari script. Do not transliterate or translate.",
  en: "The audio is in English. Transcribe it exactly as spoken in English.",
  es: "The audio is in Spanish. Transcribe it exactly as spoken in Spanish.",
  fr: "The audio is in French. Transcribe it exactly as spoken in French.",
  de: "The audio is in German. Transcribe it exactly as spoken in German.",
  ja: "The audio is in Japanese. Transcribe it exactly as spoken in Japanese script.",
  zh: "The audio is in Chinese (Mandarin). Transcribe it exactly as spoken in Chinese characters.",
}

async function transcribeWithGemini(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const arrayBuffer = await wavBlob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Data = btoa(binary)

  const languageInstruction =
    languageCode && languageCode !== "auto"
      ? (geminiLanguagePromptMap[languageCode] ?? `The audio is in language code "${languageCode}". Transcribe it exactly as spoken in its native script.`)
      : "Detect the language automatically and transcribe exactly as spoken in the original script. If Nepali, use Devanagari (नेपाली). If Hindi, use Devanagari. If Chinese or Japanese, use their respective scripts."

  const transcriptionPrompt = `${languageInstruction} Output only the raw transcription — no translations, no summaries, no notes, no headers, no explanations.`

  const payload = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: "audio/wav",
            data: base64Data
          }
        },
        {
          text: transcriptionPrompt
        }
      ]
    }],
    generationConfig: {
      temperature: 0.0
    }
  }

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"]
  let lastError: Error | null = null

  for (const model of models) {
    try {
      console.log(`[GEMINI_SPEECH] Attempting transcription with model: ${model}, language: ${languageCode}`)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`[GEMINI_SPEECH] Model ${model} failed: ${response.status} - ${errorText}`)
        lastError = new Error(`Gemini API failed for model ${model}: ${response.status} - ${errorText}`)
        continue
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        console.log(`[GEMINI_SPEECH] Transcription successful with model: ${model}`)
        return text
      }
    } catch (err: any) {
      console.warn(`[GEMINI_SPEECH] Error with model ${model}:`, err)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error("All Gemini models failed to transcribe the audio.")
}

async function transcribeWithGroq(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", wavBlob, "recording.wav")
  formData.append("model", "whisper-large-v3-turbo")
  if (languageCode && languageCode !== "auto") {
    formData.append("language", languageCode)
  }

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[GROQ_SPEECH] API error response:", errorText)
    throw new Error(`Groq API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}

async function transcribeWithHuggingFace(wavBlob: Blob, token: string | undefined, languageCode: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Convert wav blob to base64 for the JSON payload
  const arrayBuffer = await wavBlob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Audio = btoa(binary)

  // whisper-large-v3-turbo supports Nepali and 99 other languages
  // Pass language as ISO 639-1 code so HF routes to the correct decoder
  const parameters: Record<string, unknown> = { return_timestamps: false }
  if (languageCode && languageCode !== "auto") {
    parameters.language = languageCode
  }

  const response = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo", {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs: base64Audio, parameters }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[HF_SPEECH] API error response:", errorText)
    throw new Error(`Hugging Face API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}
