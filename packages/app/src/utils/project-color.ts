export type ProjectColorKey = "pink" | "mint" | "orange" | "purple" | "cyan" | "lime" | "default"

export type ProjectColorSet = {
  bg: string
  fg: string
  border: string
  accent: string
}

const COLOR_MAP: Record<ProjectColorKey, ProjectColorSet> = {
  pink: {
    bg: "var(--avatar-background-pink)",
    fg: "var(--avatar-text-pink)",
    border: "color-mix(in srgb, var(--avatar-background-pink) 60%, transparent)",
    accent: "#e879a0",
  },
  mint: {
    bg: "var(--avatar-background-mint)",
    fg: "var(--avatar-text-mint)",
    border: "color-mix(in srgb, var(--avatar-background-mint) 60%, transparent)",
    accent: "#34d399",
  },
  orange: {
    bg: "var(--avatar-background-orange)",
    fg: "var(--avatar-text-orange)",
    border: "color-mix(in srgb, var(--avatar-background-orange) 60%, transparent)",
    accent: "#fb923c",
  },
  purple: {
    bg: "var(--avatar-background-purple)",
    fg: "var(--avatar-text-purple)",
    border: "color-mix(in srgb, var(--avatar-background-purple) 60%, transparent)",
    accent: "#a855f7",
  },
  cyan: {
    bg: "var(--avatar-background-cyan)",
    fg: "var(--avatar-text-cyan)",
    border: "color-mix(in srgb, var(--avatar-background-cyan) 60%, transparent)",
    accent: "#22d3ee",
  },
  lime: {
    bg: "var(--avatar-background-lime)",
    fg: "var(--avatar-text-lime)",
    border: "color-mix(in srgb, var(--avatar-background-lime) 60%, transparent)",
    accent: "#a3e635",
  },
  default: {
    bg: "var(--surface-info-base)",
    fg: "var(--text-base)",
    border: "color-mix(in srgb, var(--surface-info-base) 60%, transparent)",
    accent: "#6b7280",
  },
}

export function getProjectColors(colorKey?: string | null): ProjectColorSet {
  if (colorKey && colorKey in COLOR_MAP) return COLOR_MAP[colorKey as ProjectColorKey]
  return COLOR_MAP.default
}

export function colorKeyFromIconColor(iconColor?: string): ProjectColorKey {
  if (iconColor && iconColor in COLOR_MAP) return iconColor as ProjectColorKey
  return "default"
}
