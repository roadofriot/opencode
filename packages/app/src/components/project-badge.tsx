import { createMemo, Show, type JSX } from "solid-js"
import { getProjectColors, colorKeyFromIconColor } from "@/utils/project-color"
import type { LocalProject } from "@/context/layout"
import { displayName } from "@/pages/layout/helpers"

export type ProjectBadgeSize = "xs" | "sm" | "md"

export function ProjectBadge(props: {
  project?: LocalProject | null
  size?: ProjectBadgeSize
  class?: string
  maxChars?: number
  showDot?: boolean
  active?: boolean
}): JSX.Element {
  const size = () => props.size ?? "sm"
  const maxChars = () => props.maxChars ?? 14

  const colors = createMemo(() => {
    const colorKey = colorKeyFromIconColor(props.project?.icon?.color)
    return getProjectColors(colorKey)
  })

  const label = createMemo(() => {
    if (!props.project) return "No Project"
    const name = displayName(props.project)
    return name.length > maxChars() ? name.slice(0, maxChars()) + "…" : name
  })

  const sizeClass = () => {
    switch (size()) {
      case "xs": return "h-4 px-1 text-[10px] gap-1"
      case "sm": return "h-5 px-1.5 text-[11px] gap-1"
      case "md": return "h-6 px-2 text-[12px] gap-1.5"
    }
  }

  const dotSize = () => {
    switch (size()) {
      case "xs": return "size-1.5"
      case "sm": return "size-2"
      case "md": return "size-2.5"
    }
  }

  return (
    <span
      class={`inline-flex shrink-0 items-center rounded-[4px] font-medium leading-none select-none project-badge-anim ${sizeClass()} ${props.class ?? ""}`}
      style={{
        background: colors().bg,
        color: colors().fg,
        border: `1px solid ${colors().border}`,
        "box-shadow": props.active
          ? `0 0 0 1.5px ${colors().accent}40`
          : undefined,
      }}
      title={props.project?.worktree}
    >
      <Show when={props.showDot}>
        <span
          class={`shrink-0 rounded-full ${dotSize()}`}
          style={{ background: colors().accent }}
        />
      </Show>
      <span class="truncate">{label()}</span>
    </span>
  )
}

/** Inline chip for the top-bar active project indicator */
export function ActiveProjectChip(props: {
  project?: LocalProject | null
  onClick?: () => void
}): JSX.Element {
  const colors = createMemo(() => getProjectColors(colorKeyFromIconColor(props.project?.icon?.color)))

  const label = createMemo(() => {
    if (!props.project) return "No Project"
    const name = displayName(props.project)
    return name.length > 18 ? name.slice(0, 18) + "…" : name
  })

  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.project?.worktree}
      class="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[6px] border px-2 text-[12px] font-medium leading-none transition-all duration-150 ease-out hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-border-border-focus)] project-badge-anim"
      style={{
        background: colors().bg,
        color: colors().fg,
        "border-color": colors().border,
      }}
    >
      <span
        class="size-2 shrink-0 rounded-full"
        style={{ background: colors().accent }}
      />
      <span class="truncate">{label()}</span>
    </button>
  )
}
