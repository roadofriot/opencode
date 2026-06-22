# MindSparQ AI — Complete Feature Roadmap

> **Mission:** Turn this codebase into the most advanced, feature-rich, free & open-source AI desktop application — competitive with Cursor, Bolt, Windsurf, Claude Desktop, Codex, and other premium AI tools.

---

## 1. App Identity & Branding

### 1.1 App Identity — MindSparQ AI Desktop

| Area | Status |
|------|--------|
| App name (dev) | MindSparQ AI Dev |
| App name (beta) | MindSparQ AI Beta |
| App name (prod) | MindSparQ AI |
| Window title | MindSparQ AI |
| App IDs | ai.opencode.desktop.* |
| Deep link scheme | mindsparq:// |
| HTML title | MindSparQ AI |
| macOS menu label | MindSparQ AI |

The app already shows "MindSparQ AI" correctly — no rename needed.

### 1.2 Professional App Icon — Standardized

Create a modern, professional app icon that works across all platforms:

```
packages/identity/
├── mark.svg              # Main logo mark
├── mark-light.svg        # Light variant
├── icon-16x16.png
├── icon-32x32.png
├── icon-64x64.png
├── icon-128x128.png
├── icon-128x128@2x.png   # macOS dock
├── icon-256x256.png
├── icon-512x512.png
├── icon.icns             # macOS
├── icon.ico              # Windows
└── icon.png              # Linux (512x512)

packages/desktop/icons/{dev,beta,prod}/  →  auto-copied from identity
```

**Design guidelines for the icon:**
- Modern, flat design with subtle gradient
- Symbolic mark (not text-based) — works at 16px and 512px
- Distinct silhouette recognizable at small sizes
- Dark and light variants
- macOS Big Sur-style rounded rectangle with shadow
- Follows [Tauri icon standards](https://tauri.app/v1/guides/features/icons/)

**Colors:**
- Primary: Deep indigo/blue gradient `#4338CA` → `#6366F1`
- Accent: Cyan `#06B6D4`
- Background: Dark `#0F172A` / Light `#F8FAFC`

---

## 2. Context-Aware Response System (Casual vs Thinking)

### 2.1 The Problem

When a user says "Hello, what's up?" or "How are you?", the model spends 5-15 seconds "thinking" (reasoning tokens) before responding with a casual greeting. This wastes time and feels unnatural.

### 2.2 Solution Architecture

**Two-mode response system:**

```
User Input
    │
    ├── Query Classifier (local, fast, lightweight)
    │       │
    │       ├── Casual / Social ──→ Bypass thinking → Direct response
    │       ├── Simple Q&A ──→ Minimal thinking → Concise answer
    │       └── Complex Task ──→ Full thinking → Deep reasoning
    │
    └── Context Length Check
            │
            ├── < 3 turns ──→ Fast response (no history summary needed)
            └── ≥ 3 turns ──→ Context-aware thinking
```

### 2.3 Implementation

#### A. Query Classifier (client-side)

A lightweight classification step before sending to the LLM. This can be:
- **Regex/keyword-based** (fastest, no model needed)
- **Small local model** (e.g., DistilBERT, MiniLM via ONNX)
- **Classification prompt** (cheap, fast LLM call)

**Casual patterns** (skip thinking):
- Greetings: "hello", "hi", "hey", "namaste", "नमस्ते", "what's up"
- Social: "how are you", "k cha", "के छ", "what's going on"
- Short: messages under 20 characters
- Question marks without technical keywords

**Simple Q&A** (minimal thinking):
- Factual questions: "what is X", "define Y"
- Simple instructions: "explain this code", "translate X"
- Pattern: short question, ≤ 100 chars, no code blocks in question

**Complex tasks** (full thinking):
- Code generation/refactoring
- Multi-step reasoning
- File operations
- Debugging sessions
- Architecture planning

#### B. API Parameter Toggle

```
// Fast mode (casual/simple)
{
  "thinking": { "budget_tokens": 0 },
  "temperature": 0.7,
  "max_tokens": 256
}

// Full thinking mode (complex)
{
  "thinking": { "budget_tokens": 16000 },
  "temperature": 0.3,
  "max_tokens": 8192
}
```

#### C. Context Window Optimization

| Conversation Length | Strategy |
|-------------------|----------|
| 0-2 messages | No truncation, fresh context |
| 3-10 messages | Include last 6 messages + summary of earlier |
| 10-50 messages | Include last 8 messages + structured summary |
| 50+ messages | Include last 10 messages + detailed compressed summary |

### 2.4 Files to Create

```
packages/core/src/context-classifier/
├── index.ts              # Main classifier
├── patterns.ts           # Regex patterns for casual/simple/complex
├── classifier.test.ts    # Tests
└── types.ts              # QueryType enum, config types
```

---

## 3. Feature Integration from Premium AI Tools

### 3.1 Feature Inventory by Tool

| Tool | Key Features | Our Implementation |
|------|-------------|-------------------|
| **Cursor** | Tab-to-complete, multi-cursor edit, inline code review, composer | Agent mode with tab completion |
| **Claude Desktop** | MCP (Model Context Protocol), artifact preview, project management | Already has MCP — extend with artifact viewer |
| **Bolt.new** | Full-stack deployment preview, npm install in sandbox | Add sandboxed preview environment |
| **Windsurf** | Cascade agent, integrated terminal, diff view | Enhanced terminal + diff UI |
| **Codex CLI** | Autonomous codebase editing, multi-file refactor | Session-based batch editing |
| **Anti-Gravity / Cline** | Automated browser testing, vision-based debugging | Add browser automation tools |
| **GitHub Copilot** | Inline suggestions, chat in editor, PR review | Chat-embedded PR review |
| **Continue.dev** | Custom slash commands, docs indexing, configurable rules | Extend custom commands |
| **v0 by Vercel** | Prompt-to-component, visual preview | UI component generation |

### 3.2 Priority Features to Build

#### P0 — Must Have
- [ ] **Multi-file agentic editing** (across project, not just current file)
- [ ] **Inline code suggestions** (Cursor-style tab completion)
- [ ] **Integrated terminal with AI** (Windsurf-style)
- [ ] **Unified diff viewer** (review all changes before applying)

#### P1 — High Priority
- [ ] **Web search & browsing** (fetch docs, Stack Overflow, etc.)
- [ ] **Automated testing** (run tests, fix failures)
- [ ] **Git integration** (commit messages, PR creation, branch management)
- [ ] **Image understanding** (screenshot → code, design → implementation)

#### P2 — Differentiator
- [ ] **Sandboxed preview** (Bolt.new-style, run apps in-browser)
- [ ] **Browser automation** (test UI, debug visually)
- [ ] **Custom MCP servers** (one-click add from marketplace)
- [ ] **Project templates** (one-shot "create a Next.js app with auth")
- [ ] **Voice input** (speak to code)

#### P3 — Polish
- [ ] **Theme marketplace** (community themes)
- [ ] **Extension/plugin system** (third-party tools)
- [ ] **Usage analytics** (local-first, privacy respecting)
- [ ] **Offline mode** (local models via Ollama/LM Studio)

### 3.3 Architecture for Feature System

```
packages/features/
├── agent-editor/         # Multi-file agentic editing
├── inline-suggest/       # Tab completion (Cursor-like)
├── diff-viewer/          # Unified diff review
├── web-search/           # Web search via MCP
├── sandbox/              # Bolt.new-style preview
├── browser-automation/   # Anti-Gravity style browser test
└── voice-input/          # Speech-to-text
```

---

## 4. Authentication — Gmail & GitHub Login

### 4.1 Current State

- Desktop app has NO user login UI
- Auth is only for local sidecar communication (random UUID password)
- Remote OAuth flow exists in `packages/opencode/src/account/` but not exposed in desktop

### 4.2 New Auth System

#### A. GitHub OAuth Login

```
1. User clicks "Sign in with GitHub"
2. Desktop opens GitHub OAuth URL
3. User authorizes in browser
4. GitHub redirects to local callback server
5. Exchange code for access_token
6. Store token securely in system keychain (not plain file)
7. Fetch user profile: avatar, name, email, repos
```

**Required setup:**
- GitHub OAuth App registration → Client ID + Secret
- Local callback server (ephemeral, port 0, random)
- PKCE flow (no client_secret needed in desktop app)

**Files to create:**
```
packages/desktop/src/auth/
├── github.ts           # GitHub OAuth flow
├── google.ts           # Gmail/Google OAuth flow
├── keychain.ts         # OS-level secure storage
├── store.ts            # Auth state management
└── types.ts            # Auth user, token types
```

#### B. Gmail/Google OAuth Login

```
1. User clicks "Sign in with Google"
2. Desktop opens Google OAuth URL (scopes: profile, email)
3. User authorizes in browser
4. Exchange code for tokens
5. Store refresh + access tokens in system keychain
6. Fetch user profile
```

**Scopes requested:**
- `openid`, `profile`, `email` — basic profile
- `https://www.googleapis.com/gmail.send` — optional (for email features)

**Google Cloud Setup:**
- OAuth 2.0 Desktop application type
- Callback URI: `http://localhost:{port}/callback`
- Enable Gmail API if email features needed

### 4.3 Auth UI Integration

```
packages/app/src/components/auth/
├── auth-dialog.tsx       # Login dialog (GitHub + Google buttons)
├── auth-provider.tsx     # Auth context provider
├── user-menu.tsx         # User avatar, name, logout
└── auth-guard.tsx        # Route guard (if needed)
```

---

## 5. Supabase Integration

### 5.1 What Supabase Provides

| Service | Use Case |
|---------|----------|
| **PostgreSQL** | User accounts, settings, projects |
| **Auth** | GitHub + Google OAuth (built-in) |
| **Realtime** | Live collaboration, sync across devices |
| **Storage** | User uploads, project assets |
| **Edge Functions** | Serverless backend logic |
| **Vector** | Semantic search (pgvector) |

### 5.2 Data Model

```sql
-- Users (synced from auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  local_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history (synced for cloud access)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  title TEXT,
  messages JSONB,  -- compressed message history
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (synced across devices)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Implementation Plan

```
packages/supabase/
├── client.ts              # Supabase client init
├── auth.ts                # Supabase Auth integration (GitHub + Google)
├── profiles.ts            # Profile CRUD
├── projects.ts            # Project sync
├── conversations.ts       # Conversation history
├── settings.ts            # Settings sync
├── realtime.ts            # Realtime subscriptions
├── storage.ts             # File storage
├── types.ts               # Database types (generated)
└── migrations/            # SQL migrations
    └── 001_init.sql
```

### 5.4 Sync Architecture

```
Local (SQLite via Drizzle)
    ↑↓ sync engine (background, diff-based)
Supabase (PostgreSQL)

Sync triggers:
- On login: pull all remote data
- On app focus: sync
- On save: push locally first, queue remote
- Conflict resolution: last-write-wins (timestamp)
```

### 5.5 Supabase Project Setup

1. Create project at [supabase.com](https://supabase.com)
2. Enable Auth with GitHub + Google providers
3. Run SQL migrations
4. Generate TypeScript types: `supabase gen types typescript --local`
5. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 6. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Create professional app icon (all sizes)
- [ ] Update identity assets

### Phase 2 — Context-Aware Thinking (Week 2-3)
- [ ] Build query classifier
- [ ] Implement fast/casual response mode
- [ ] Implement full thinking mode
- [ ] Add context window optimization

### Phase 3 — Auth + Supabase (Week 3-4)
- [ ] GitHub OAuth login
- [ ] Gmail/Google OAuth login
- [ ] Supabase client setup
- [ ] Data sync engine

## Resources
- **Roadmap file:** `MINDSQARQ-ROADMAP.md`
- **Existing identities:** `packages/identity/mark.svg`, `mark-light.svg`
- **Desktop icons:** `packages/desktop/icons/{dev,beta,prod}/`

### Phase 4 — Premium Features (Week 4-8)
- [ ] Multi-file agentic editing
- [ ] Inline code suggestions
- [ ] Integrated terminal with AI
- [ ] Unified diff viewer
- [ ] Web search & browsing
- [ ] Sandboxed preview

### Phase 5 — Polish & Extend (Week 8-12)
- [ ] Browser automation
- [ ] Voice input
- [ ] Plugin system
- [ ] Theme marketplace
- [ ] Offline mode

---

## 7. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State management** | SolidJS signals + Effect | Already in use, battle-tested |
| **Database** | SQLite (local) + Supabase PostgreSQL (cloud) | Offline-first |
| **Auth** | Supabase Auth (GitHub + Google) | Built-in, free tier generous |
| **Icons** | SVG-based + PNG exports | Flexibility, small bundle |
| **Sync** | Custom diff engine with CRDT | Conflict-free, offline capabale |
| **Desktop** | Electron (current) | Market reach, mature ecosystem |
| **Version** | 2.0.0 | Major rebrand + feature jump |

---

## 8. Competitive Positioning

| Feature | Cursor Pro | Claude Max | Bolt | Windsurf | **MindSparQ AI** |
|---------|-----------|------------|------|----------|---------------|
| Price | $20/mo | $20/mo | $20/mo | $15/mo | **FREE** |
| Multi-file edit | ✅ | ❌ | ❌ | ✅ | ✅ |
| Inline suggest | ✅ | ❌ | ❌ | ❌ | ✅ |
| MCP support | ❌ | ✅ | ❌ | ❌ | ✅ |
| Sandbox preview | ❌ | ❌ | ✅ | ❌ | ✅ |
| Web search | ❌ | ✅ | ❌ | ✅ | ✅ |
| Voice input | ❌ | ❌ | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | ❌ | ❌ | **✅ MIT** |
| Offline mode | ❌ | ❌ | ❌ | ❌ | ✅ |
| Self-hostable | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 9. File Map for All Changes

```
packages/
├── desktop/
│   ├── electron-builder.config.ts        # productName, appId
│   ├── src/main/index.ts                 # APP_NAMES, APP_IDS, deep link
│   ├── src/main/windows.ts               # window title, error dialogs
│   ├── src/main/menu.ts                  # macOS menu
│   ├── src/renderer/index.tsx            # notification icon URL
│   ├── resources/linux/*.desktop         # desktop entry
│   ├── icons/{dev,beta,prod}/            # replace with new icons
│   ├── resources/icons/                  # replace with new icons
│   └── scripts/                          # copy-icons, copy-metainfo
├── app/
│   ├── index.html                        # title, meta
│   ├── src/desktop-menu.ts               # app menu label
│   ├── src/components/titlebar.tsx       # channel badge
│   ├── src/i18n/en.ts                    # all "MindSparQ" strings
│   └── public/                           # favicons
├── identity/                             # logo marks, brand assets
├── ui/
│   ├── src/components/logo.tsx           # inline SVG components
│   ├── src/assets/favicon/               # favicon SVGs
│   └── src/v2/components/wordmark-v2.tsx # wordmark SVG
├── core/
│   └── src/context-classifier/           # NEW: query classifier
├── supabase/                             # NEW: supabase integration
└── console/app/src/asset/                # wordmark/logo SVGs
```
