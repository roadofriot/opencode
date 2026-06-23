export interface RunConfig {
  language: string
  label: string
  command: string
  debugCommand?: string
  icon: string
}

const RUN_CONFIGS: Record<string, Omit<RunConfig, "language">> = {
  typescript: {
    label: "TypeScript",
    command: "npx tsx",
    debugCommand: "node --inspect-brk -e \"require('ts-node').register(); require('./index.ts')\"",
    icon: "ts",
  },
  javascript: {
    label: "JavaScript",
    command: "node",
    debugCommand: "node --inspect-brk",
    icon: "js",
  },
  python: {
    label: "Python",
    command: "python3",
    debugCommand: "python3 -m pdb",
    icon: "py",
  },
  ruby: {
    label: "Ruby",
    command: "ruby",
    debugCommand: "ruby -r debug",
    icon: "rb",
  },
  go: {
    label: "Go",
    command: "go run .",
    debugCommand: "dlv debug",
    icon: "go",
  },
  rust: {
    label: "Rust",
    command: "cargo run",
    debugCommand: "cargo run",
    icon: "rs",
  },
  java: {
    label: "Java",
    command: "javac && java",
    icon: "java",
  },
  kotlin: {
    label: "Kotlin",
    command: "kotlin",
    icon: "kt",
  },
  swift: {
    label: "Swift",
    command: "swift",
    icon: "swift",
  },
  php: {
    label: "PHP",
    command: "php",
    icon: "php",
  },
  elixir: {
    label: "Elixir",
    command: "elixir",
    icon: "ex",
  },
  haskell: {
    label: "Haskell",
    command: "runhaskell",
    icon: "hs",
  },
  c: {
    label: "C",
    command: "gcc -o out ./*.c && ./out",
    icon: "c",
  },
  cpp: {
    label: "C++",
    command: "g++ -o out ./*.cpp && ./out",
    icon: "cpp",
  },
  csharp: {
    label: "C#",
    command: "dotnet run",
    icon: "cs",
  },
  scala: {
    label: "Scala",
    command: "scala",
    icon: "scala",
  },
  lua: {
    label: "Lua",
    command: "lua",
    icon: "lua",
  },
  r: {
    label: "R",
    command: "Rscript",
    icon: "r",
  },
  julia: {
    label: "Julia",
    command: "julia",
    icon: "jl",
  },
  dart: {
    label: "Dart",
    command: "dart run",
    icon: "dart",
  },
  zig: {
    label: "Zig",
    command: "zig build run",
    icon: "zig",
  },
  shellscript: {
    label: "Shell",
    command: "bash",
    icon: "sh",
  },
  powershell: {
    label: "PowerShell",
    command: "pwsh",
    icon: "ps1",
  },
}

export function getRunConfig(language: string): RunConfig | undefined {
  const config = RUN_CONFIGS[language]
  if (!config) return undefined
  return { language, ...config }
}

export function getAllRunConfigs(): RunConfig[] {
  return Object.entries(RUN_CONFIGS).map(([language, config]) => ({
    language,
    ...config,
  }))
}

export function detectEntryFile(files: string[], language: string): string | undefined {
  const ENTRY_PATTERNS: Record<string, string[]> = {
    typescript: ["index.ts", "main.ts", "app.ts", "src/index.ts", "src/main.ts", "src/app.ts"],
    javascript: ["index.js", "main.js", "app.js", "src/index.js", "src/main.js", "src/app.js"],
    python: ["main.py", "app.py", "manage.py", "src/main.py"],
    ruby: ["main.rb", "app.rb", "config.ru", "Gemfile"],
    go: ["main.go", "cmd/main.go", "cmd/*/main.go"],
    rust: ["src/main.rs", "main.rs"],
    java: ["src/main/java/**/App.java", "src/main/java/**/Main.java"],
    php: ["index.php", "src/index.php"],
    swift: ["Sources/main.swift", "main.swift"],
    dart: ["bin/main.dart", "lib/main.dart", "main.dart"],
    zig: ["src/main.zig", "main.zig"],
    c: ["main.c"],
    cpp: ["main.cpp"],
  }

  const patterns = ENTRY_PATTERNS[language] ?? []
  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      const prefix = pattern.replace("*", "")
      const match = files.find((f) => f.startsWith(prefix) && f.endsWith(".java"))
      if (match) return match
    } else {
      if (files.includes(pattern)) return pattern
    }
  }

  const ext = LANGUAGE_EXT_MAP[language]
  if (ext) {
    const match = files.find((f) => f.endsWith(ext))
    if (match) return match
  }

  return undefined
}

const LANGUAGE_EXT_MAP: Record<string, string> = {
  typescript: ".ts",
  javascript: ".js",
  python: ".py",
  ruby: ".rb",
  go: ".go",
  rust: ".rs",
  java: ".java",
  php: ".php",
  swift: ".swift",
  dart: ".dart",
  zig: ".zig",
  c: ".c",
  cpp: ".cpp",
}

export function hasBuildFile(files: string[], language: string): boolean {
  const BUILD_FILES: Record<string, string[]> = {
    typescript: ["tsconfig.json", "package.json"],
    javascript: ["package.json"],
    python: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
    ruby: ["Gemfile", "*.gemspec"],
    go: ["go.mod"],
    rust: ["Cargo.toml"],
    java: ["pom.xml", "build.gradle", "build.gradle.kts"],
    kotlin: ["build.gradle.kts", "build.gradle"],
    php: ["composer.json"],
    swift: ["Package.swift"],
    dart: ["pubspec.yaml"],
    zig: ["build.zig"],
    csharp: ["*.csproj", "*.sln"],
    scala: ["build.sbt"],
  }

  const patterns = BUILD_FILES[language] ?? []
  return patterns.some((pattern) => {
    if (pattern.includes("*")) {
      const ext = pattern.replace("*", "")
      return files.some((f) => f.endsWith(ext))
    }
    return files.includes(pattern)
  })
}
