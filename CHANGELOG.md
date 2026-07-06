# Changelog

All notable changes to MindSparQ AI are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Dynamic Mermaid Diagram Rendering** — Code blocks using `mermaid` syntax are compiled to inline SVG dynamically using a CDN-loaded renderer. Displays custom loading states and error indicator cards for invalid syntax.
- **Local storage-persisted Notes module** — Integrated a persistent notes section directly into the session side panel. Features action buttons to clear notes or send them directly into the active prompt loop.
- **File Manager CRUD Operations** — Hovering over any file tree item now reveals a dropdown menu providing actions to create new files/directories, rename items, and delete files/folders recursively (routed silently via background PTY sessions).
- **Context Classifier Integration** — Casual and simple messages now automatically
  receive a reduced thinking variant, bypassing expensive reasoning token budget.
  This eliminates the "5-15 second thinking delay" on greetings and simple Q&A.
  - Supports English, Nepali (Devanagari), and Hindi patterns.
  - Classifier wired into `SessionPrompt.createUserMessage` before each LLM turn.
- **`provider/sse-util.ts`** — Extracted SSE stream utilities (`wrapSseStreamWithTimeout`,
  `timeoutController`, `OPENAI_HEADER_TIMEOUT_DEFAULT`) from the 76KB `provider.ts`
  god-file into a focused, testable module with improved inline documentation.
- **`provider/key-pool.ts`** — Added round-robin API key selection with automatic exponential cooldowns on HTTP 429 errors.
- **`provider/local-discovery.ts`** — Implemented concurrent port-probing (1s timeout) to auto-discover local model configurations from Ollama, LM Studio, vLLM, and llama.cpp.
- **Web Speech API integration** — Capture speech natively in the browser, auto-routing voice recordings to local/cloud Whisper configurations if browser speech APIs are missing or block permissions.
- **Workspace Multi-Tab Terminal** — Support workspace PTY terminals, allowing tab creation, title editing, and reordering via drag-and-drop.
- **HTTP Server Rate Limiting** — Added sliding-window rate limiting (120 req/min limit per client IP) inside packages/opencode server, explicitly exempting loopback local hosts (127.0.0.1, ::1) to ensure event stream stability.

### Fixed
- **xAI/Grok context window overflow detection** — Expanded RegExp patterns in `isContextOverflow` to accurately identify Grok's custom JSON validation and token-limit error messages, preventing unhandled runtime exceptions.
- **Type-unsafe `globalThis` patch** — Replaced `(globalThis as any).AI_SDK_LOG_WARNINGS`
  with a proper `declare global` augmentation, eliminating a TypeScript `any` cast.
- **Drizzle import consolidation** — Merged 9 consecutive single-operator drizzle-orm
  imports in `session/session.ts` into one destructured import.

### Changed
- Extracted voice transcription pure functions out of `prompt-input.tsx` into a standalone utility file `voice-transcription.ts`.
- Extracted prompt-input selection buttons and control elements into a separate sub-component `composer-controls.tsx`.
- Profiled SolidJS layout reactivity to batch updates and prevent rendering bottlenecks.

---

## [1.17.8] — 2026-07-05

### Initial tracked release

- Multi-provider AI: Gemini, OpenAI, Claude, Grok, Mistral, Groq, Cerebras,
  Perplexity, Together AI, DeepInfra, Cohere, OpenRouter, Azure OpenAI,
  Amazon Bedrock, Google Vertex AI (+ Anthropic), Alibaba, Venice, GitLab AI,
  GitHub Copilot, Vercel AI Gateway.
- OpenAI-compatible adapter for Ollama, LM Studio, vLLM, llama.cpp.
- Persistent sessions in SQLite (Drizzle ORM).
- Streaming responses with per-chunk SSE timeout.
- Session compaction, summarization, context epoch management.
- Session forking, sharing, archiving, export/import.
- Token and cost tracking per session.
- Subagent / child session hierarchy.
- Markdown + code block rendering.
- Context classifier for casual vs. complex query routing.
- AI coding tools: read, write, edit, apply_patch, shell, glob, grep, LSP, webfetch, websearch.
- Git integration: commit messages, PR creation, worktree, diff.
- MCP (Model Context Protocol) client with OAuth support.
- LSP integration for code intelligence.
- Plugin system with hot-loadable plugins.
- Named agents with per-agent model/variant configuration.
- Permission management with interactive permission prompts.
- Electron desktop app with auto-updater, Sentry crash reporting, deep links.
- TUI (terminal UI) with full keybinding system.
- WSL support.
