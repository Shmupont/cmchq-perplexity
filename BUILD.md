# CMC HQ — Build Guide

## For Claude Code / Subagents

Read `SPEC.md` first. This file tells you how to execute.

---

## Phase 1: Shell + Terminal

### Step 1 — Scaffold
```bash
npm create @nicoledev/electron-vite@latest cmchq -- --template react-ts
cd cmchq
npm install
```

### Step 2 — Install dependencies
```bash
# Core
npm i zustand better-sqlite3 @types/better-sqlite3 yahoo-finance2 node-cron
npm i react-markdown remark-gfm

# Charts
npm i lightweight-charts

# Graph
npm i @antv/g6

# Styling
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Gmail
npm i googleapis

# AI
npm i @anthropic-ai/sdk openai
```

### Step 3 — Build order
1. `src/main/services/db.ts` — SQLite setup with all tables from SPEC
2. `src/renderer/styles/` — Tailwind config with SPEC color palette
3. `src/renderer/components/layout/` — Sidebar + TopBar + RightDrawer shell
4. `src/renderer/App.tsx` — Router with all 5 pages
5. `src/main/services/portfolio.ts` — yahoo-finance2 integration
6. `src/main/ipc/portfolio.ts` — IPC handlers
7. `src/renderer/pages/Terminal.tsx` — Portfolio page
8. `src/renderer/components/terminal/` — All terminal components

### Step 4 — Verify
- `npm run dev` should show the app with sidebar + portfolio page
- Portfolio should show mock data (hardcoded holdings)
- Dark theme applied throughout

---

## Phase 2: Brain

### Step 1 — Vault Parser
- `src/main/services/brain.ts`
- Read all `.md` files from `OBSIDIAN_VAULT_PATH`
- Parse frontmatter (yaml between `---` markers)
- Extract `[[wikilinks]]` with regex: `/\[\[([^\]]+)\]\]/g`
- Build adjacency list: `{ notePath: string, title: string, type: string, area: string, links: string[] }`
- Watch for file changes with `chokidar`

### Step 2 — Graph
- `src/renderer/components/brain/KnowledgeGraph.tsx`
- Use `@antv/g6` force-directed layout
- Node colors from `type` frontmatter
- Node size from link count
- Click node → show note in NoteViewer panel

### Step 3 — Embeddings
- On indexing: chunk each note (by headers or 500 tokens)
- Call OpenAI `text-embedding-3-small` for each chunk
- Store in `brain_notes` table (embedding as BLOB)
- Cosine similarity search function in `db.ts`

### Step 4 — Brain Chat
- `src/renderer/components/brain/BrainChat.tsx`
- User types question → embed query → top-10 similar chunks → Claude with context
- System prompt from SPEC
- Stream response

---

## Phase 3: Inbox

### Step 1 — Gmail Auth
- `scripts/gmail-auth.ts` — helper to get refresh tokens
- Store encrypted in safeStorage
- Need: Google Cloud project + OAuth credentials

### Step 2 — Email Sync
- `src/main/services/email.ts`
- For each account: fetch unread + recent (last 48h)
- Store in `emails` table
- Incremental sync every 5 min

### Step 3 — AI Triage
- For new emails: call Claude haiku with sender + subject + snippet
- Score 0-1 importance + reason
- Cache in `importance_score` column

### Step 4 — UI
- `src/renderer/pages/Inbox.tsx`
- Three columns, top 3 per account
- Full inbox toggle

---

## Phase 4: Crew

### Step 1 — Agent Definitions
- `src/main/services/agents.ts`
- Each agent: system prompt, allowed tools, default model
- Tool implementations: web_search, web_fetch, brain_search, portfolio_data, email_search

### Step 2 — Task Runner
- Accept task description + agent type
- Build message with tools
- Stream Claude response
- Store result in `agent_tasks` table

### Step 3 — UI
- `src/renderer/pages/Crew.tsx`
- Agent grid, task input, streaming output, task history

---

## Phase 5: Briefing

### Step 1 — Briefing Generator
- `src/main/services/briefing.ts`
- Gather: portfolio moves, top emails, calendar, follow-ups
- Send to Claude with briefing template
- Store in `briefings` table

### Step 2 — Scheduler
- `node-cron`: daily at 7am PT, weekly at Sunday 8pm PT

### Step 3 — UI
- `src/renderer/pages/Briefing.tsx`
- Current brief + archive

---

## Environment Setup

```bash
cp .env.example .env
# Fill in API keys
# Run Gmail auth: npx ts-node scripts/gmail-auth.ts
```

## Dev Commands
```bash
npm run dev          # Start Electron in dev mode
npm run build:mac    # Build for macOS
npm run lint         # ESLint
```
