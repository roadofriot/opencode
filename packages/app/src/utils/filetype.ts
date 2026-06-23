import path from "node:path"

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".mtsx": "typescript",
  ".ctsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".dart": "dart",
  ".cs": "csharp",
  ".fs": "fsharp",
  ".c": "c",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".cc": "cpp",
  ".c++": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".php": "php",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".lua": "lua",
  ".r": "r",
  ".jl": "julia",
  ".scala": "scala",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".cljc": "clojure",
  ".ml": "ocaml",
  ".mli": "ocaml",
  ".zig": "zig",
  ".gleam": "gleam",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".sh": "shellscript",
  ".bash": "shellscript",
  ".zsh": "shellscript",
  ".ps1": "powershell",
  ".sql": "sql",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".md": "markdown",
  ".markdown": "markdown",
  ".dockerfile": "dockerfile",
  ".tf": "terraform",
  ".tfvars": "terraform",
  ".hcl": "hcl",
  ".nix": "nix",
  ".proto": "protobuf",
}

export function detectLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return LANGUAGE_EXTENSIONS[ext] ?? "none"
}

export function detectProjectLanguage(files: string[]): string {
  const counts = new Map<string, number>()
  for (const file of files) {
    const lang = detectLanguage(file)
    if (lang === "none") continue
    counts.set(lang, (counts.get(lang) ?? 0) + 1)
  }
  let best = "unknown"
  let bestCount = 0
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang
      bestCount = count
    }
  }
  return best
}
