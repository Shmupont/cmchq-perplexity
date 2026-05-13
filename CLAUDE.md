# CLAUDE.md — Agent Instructions for CMC HQ

> This file is the master briefing for all Claude Code agents working on this repo.
> Read SPEC.md for the full product spec. Read BUILD.md for implementation steps.
> This file tells you HOW to work together.

---

## Project Overview

CMC HQ is a personal Electron desktop app — a Bloomberg-meets-Jarvis command center.
It has 5 systems: Brain, Terminal, Inbox, Crew, Briefing.
One user. One machine. macOS only. Elite dark visuals.

**Owner:** Coleman Dupont
**Coordinator:** Jarvis (OpenClaw AI — manages agents, reviews, merges)
**Repo:** github.com/Shmupont/cmchq

---

## Architecture Rules (ALL agents must follow)

1. **Electron + electron-vite** — not Next.js, not Vite standalone. This is a desktop app.
2. **React 18 + TypeScript** — strict types, no `any` unless truly unavoidable.
3. **TailwindCSS** — use the custom theme from SPEC.md color palette. No inline styles.
4. **Zustand** for state — not Redux, not Context API for global state.
5. **better-sqlite3** for database — not Prisma, not TypeORM. Raw SQL is fine.
6. **IPC pattern**: renderer calls `window.api.methodName()` → preload exposes → main process handles. Never import Node modules in renderer.
7. **Service pattern**: each system has a service in `src/main/services/` that handles business logic, and an IPC handler in `src/main/ipc/` that exposes it to renderer.
8. **No server needed** — everything runs locally in Electron's main process.
9. **Read-only on Obsidian vault** — NEVER write to the vault directory.
10. **Credentials via safeStorage** — never store API keys or tokens in plain text files.

---

## Visual Design Rules (ALL agents must follow)

```
Background:       #04080f
Surface:          #0a1018
Surface-elevated: #0f1623
Border:           #1a2a3a
Accent Blue:      #3b82f6
Accent Cyan:      #22d3ee
Positive:         #22c55e
Negative:         #ef4444
Text Primary:     #e2e8f0
Text Secondary:   #94a3b8
Font UI:          Inter
Font Numbers:     JetBrains Mono
```

- Monospace font for ALL numbers (prices, counts, dates)
- Green/red ONLY for gain/loss, not decoration
- Cards have subtle borders (#1a2a3a), hover brightens to #2a4060
- No white backgrounds anywhere
- 200ms transitions on interactive elements
- Carbon fiber texture on major cards (CSS background pattern)

---

## Agent Assignments

### Agent 1: SCAFFOLD (Phase 1a)
**Task:** Set up the Electron project shell, design system, and navigation.

**What to build:**
1. Initialize electron-vite project with React + TypeScript template
2. Install ALL dependencies listed in BUILD.md
3. Configure Tailwind with the full color palette from SPEC
4. Build the sidebar navigation (icons only, expandable on hover)
5. Build the top bar (app title, clock, system status indicators)
6. Build the right drawer component (slides in/out, used by multiple systems)
7. Set up the router — 5 pages: Brain, Terminal, Inbox, Crew, Briefing + Settings
8. Set up SQLite with ALL tables from SPEC database schema
9. Create `.env.example` with all required env vars
10. Add Inter + JetBrains Mono fonts

**Output:** A working Electron app with navigation, empty pages, and the design system. Running `npm run dev` should show the shell with dark theme and sidebar.

**Branch:** `scaffold`

---

### Agent 2: TERMINAL (Phase 1b)
**Task:** Build the portfolio dashboard (The Terminal).
**Depends on:** Agent 1 (scaffold must be merged first)

**What to build:**
1. `src/main/services/portfolio.ts` — yahoo-finance2 integration
   - Fetch quotes for a list of tickers
   - Calculate P&L from holdings (shares × price vs shares × costBasis)
   - Calculate allocation percentages
   - Cache prices in SQLite `price_cache` table
2. `src/main/services/scheduler.ts` — node-cron, refresh every 5 min during market hours
3. `src/main/ipc/portfolio.ts` — expose portfolio data to renderer
4. `src/renderer/pages/Terminal.tsx` — main page layout
5. Components:
   - `PortfolioOverview.tsx` — total value, daily P&L, time period buttons
   - `AllocationDonut.tsx` — interactive donut chart (sector breakdown)
   - `HoldingsGrid.tsx` — sortable table of all holdings
   - `MacroBar.tsx` — bottom ticker with S&P, NASDAQ, 10Y, VIX, BTC
   - `MiniChart.tsx` — TradingView Lightweight Charts for individual ticker
6. Portfolio config UI in Settings (add/edit holdings)

**Data:** Use these tickers as defaults: SHV, IBB, XLF, XLV, XLY, VDC, VDE, VIS, VGT, VNQ, VPU, AAPL, GOOGL. Coleman will fill in real shares/cost basis later.

**Branch:** `terminal`

---

### Agent 3: BRAIN (Phase 2)
**Task:** Build the knowledge graph and AI assistant (The Brain).
**Depends on:** Agent 1 (scaffold must be merged first)

**What to build:**
1. `src/main/services/brain.ts` — Obsidian vault parser
   - Recursively read all `.md` files from vault path
   - Parse YAML frontmatter (between `---` markers)
   - Extract `[[wikilinks]]` via regex
   - Build graph data structure: nodes (notes) + edges (links)
   - File watcher with `chokidar` for live updates
   - Embedding indexer: chunk notes by headers, call OpenAI embeddings API
   - Cosine similarity search function
2. `src/main/ipc/brain.ts` — expose graph data + search + chat to renderer
3. Components:
   - `KnowledgeGraph.tsx` — @antv/g6 force-directed graph
     - Node color by `type` frontmatter (hub=blue, person=cyan, project=green, topic=purple, document=gray)
     - Node size by link count
     - Click node → NoteViewer
     - Search/filter bar
     - Zoom controls
   - `NoteViewer.tsx` — renders markdown note in right drawer
   - `BrainChat.tsx` — chat interface in right drawer
     - RAG: embed query → top 10 chunks → Claude with context
     - Streaming responses
     - System prompt: "You are Coleman's second brain..."
   - `VaultStats.tsx` — total notes, by type, recently modified, orphans

**Vault path:** `~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain/`

**Branch:** `brain`

---

### Agent 4: INBOX (Phase 3)
**Task:** Build the unified email system (The Inbox).
**Depends on:** Agent 1 (scaffold)

**What to build:**
1. `scripts/gmail-auth.ts` — OAuth2 helper for getting refresh tokens
2. `src/main/services/email.ts` — Gmail API integration
   - Auth with refresh tokens (stored in safeStorage)
   - Fetch unread + recent (last 48h) for each account
   - Store in `emails` SQLite table
   - Incremental sync every 5 min
   - AI triage: for each new email, call Claude haiku to score importance (0-1) + reason
3. `src/main/ipc/email.ts` — expose email data to renderer
4. Components:
   - `TriageView.tsx` — 3 columns, one per account, top 3 most important
   - `AccountColumn.tsx` — single account column with email cards
   - `EmailCard.tsx` — sender, subject, preview, importance badge, time
   - `EmailDetail.tsx` — full email in right drawer modal
   - Full inbox toggle (all unread across accounts)

**Accounts:**
- colemandski@gmail.com (label: "Personal")
- colemansdupont@gmail.com (label: "Business")
- colemandupont@ucsb.edu (label: "School")

**Branch:** `inbox`

---

### Agent 5: CREW + BRIEFING (Phase 4-5)
**Task:** Build the agent infrastructure and briefing system.
**Depends on:** Agents 1-4 (needs all other systems for data access)

**What to build:**
1. `src/main/services/agents.ts` — Agent orchestration
   - Agent registry: research, analysis, writer, planner, monitor
   - Each agent: system prompt, model, allowed tools
   - Tool implementations: web search (via fetch), brain search, portfolio data, email search
   - Task runner: accept task, execute with Claude tool use, stream results
   - Store in `agent_tasks` table
2. `src/main/services/briefing.ts` — Briefing generator
   - Gather data from portfolio, email, brain (follow-ups)
   - Claude prompt with structured template
   - Generate daily (7am PT) and weekly (Sunday 8pm PT) via node-cron
   - Store in `briefings` table
3. Components:
   - `AgentGrid.tsx` — agent cards with status
   - `AgentCard.tsx` — icon, name, description
   - `TaskRunner.tsx` — input + streaming output
   - `TaskQueue.tsx` — active/completed tasks
   - `ResultsFeed.tsx` — activity feed
   - `DailyBrief.tsx` — current brief view
   - `WeeklyBrief.tsx` — weekly summary
   - `BriefArchive.tsx` — past briefings

**Branch:** `crew-briefing`

---

## Git Workflow

1. Each agent works on their own branch (listed above)
2. Jarvis reviews and merges into `main`
3. Agent 1 (scaffold) goes first — all others branch from `main` after scaffold merges
4. Agents 2, 3, 4 can work in parallel after scaffold
5. Agent 5 goes last (depends on all systems)

## Merge Order
```
scaffold → main
terminal → main (parallel)
brain → main (parallel)  
inbox → main (parallel)
crew-briefing → main (last)
```

---

## What NOT To Do

- Don't use Next.js or any server framework
- Don't create a web app — this is Electron
- Don't use React Router DOM — use simple state-based routing or electron-router
- Don't store secrets in .env files at runtime — use Electron safeStorage
- Don't write to the Obsidian vault
- Don't send emails without user clicking a confirm button
- Don't use heavyweight ORMs — raw SQL with better-sqlite3 is fine
- Don't over-abstract — this is built for one person, keep it direct

---

## Testing Your Work

Before marking your task as done:
1. `npm run dev` must start without errors
2. Your page/component must render with correct styling
3. Data must flow: service → IPC → renderer (mock data is fine if API key not set)
4. No TypeScript errors (`npm run typecheck`)
5. Dark theme applied — no white/light elements

---

*When in doubt, read SPEC.md. It has the answer.*
