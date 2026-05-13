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

## 3-Agent Plan

There are **3 Claude Code agents**. Work is split so Agent 1 goes first, then Agents 2 and 3 run in parallel.

```
Agent 1: FOUNDATION  →  merge to main
                              ↓
              ┌───────────────┴───────────────┐
        Agent 2: DATA                   Agent 3: INTELLIGENCE
        (Brain + Inbox)                 (Crew + Briefing)
              └───────────────┬───────────────┘
                              ↓
                         Final merge
```

---

## Agent 1: FOUNDATION
**Scope:** Electron scaffold + design system + sidebar + SQLite + Portfolio dashboard (The Terminal)
**Branch:** `foundation`
**Depends on:** Nothing — goes first

### What to build (in order):

#### 1. Project setup
- Initialize electron-vite with React + TypeScript
- Install ALL dependencies:
  ```bash
  # Core
  npm i zustand better-sqlite3 @types/better-sqlite3 yahoo-finance2 node-cron
  npm i react-markdown remark-gfm
  # Charts
  npm i lightweight-charts
  # Graph (for Agent 2 later — install now)
  npm i @antv/g6
  # Styling
  npm i -D tailwindcss postcss autoprefixer
  # Gmail (for Agent 2 later — install now)
  npm i googleapis
  # AI
  npm i @anthropic-ai/sdk openai
  # File watching (for Agent 2 later — install now)
  npm i chokidar
  ```

#### 2. Design system
- Tailwind config with full SPEC color palette
- Global CSS: Inter + JetBrains Mono fonts, dark background
- Utility classes for cards, borders, glow effects, carbon fiber texture

#### 3. App shell
- `src/main/index.ts` — create BrowserWindow (1400×900, frameless or custom titlebar)
- `src/main/preload.ts` — expose IPC bridge
- `src/renderer/App.tsx` — state-based page routing (no react-router)
- Sidebar: left sidebar, collapsed (56px icons only), expand on hover (200px with labels)
  - 🧠 Brain, 📊 Terminal, 📧 Inbox, 🤖 Crew, 📋 Briefing, ⚙️ Settings
- Top bar: "CMC HQ" title left, clock right, subtle border bottom
- Right drawer: slide-in panel component (width 400px, used by other systems later)
- Page transitions: fade or slide (200ms)

#### 4. Database
- `src/main/services/db.ts`
- Initialize SQLite with ALL tables from SPEC.md database schema section
- Include: holdings, price_cache, email_accounts, emails, brain_notes, agent_tasks, briefings, signals

#### 5. Portfolio service
- `src/main/services/portfolio.ts`
  - Fetch quotes via yahoo-finance2 for a list of tickers
  - Calculate: current value, day change, day change %, total P&L, allocation weight
  - Cache in price_cache table
  - Default holdings (for dev): SHV, IBB, XLF, XLV, XLY, VDC, VDE, VIS, VGT, VNQ, VPU, AAPL, GOOGL (10 shares each, $100 cost basis — placeholder)
- `src/main/services/scheduler.ts`
  - node-cron: refresh portfolio every 5 min during market hours (M-F 6:30am-1:00pm PT)

#### 6. Portfolio IPC
- `src/main/ipc/portfolio.ts`
  - `getPortfolio()` → returns holdings with current prices + calculations
  - `getQuote(ticker)` → single ticker detail
  - `getMacro()` → S&P 500, NASDAQ, DJI, 10Y, VIX, BTC, ETH

#### 7. Portfolio UI
- `src/renderer/pages/Terminal.tsx` — page layout
- Components:
  - `PortfolioOverview.tsx` — total value (large JetBrains Mono), daily P&L (green/red), period buttons (1D/1W/1M/3M/YTD/1Y)
  - `AllocationDonut.tsx` — interactive donut chart. Sectors color-coded. Hover shows ticker + weight + value. Use canvas or SVG.
  - `HoldingsGrid.tsx` — sortable data table. Columns: Ticker, Name, Shares, Price, Day Chg, Day Chg %, P&L, Weight. Rows clickable.
  - `MacroBar.tsx` — fixed bottom bar with macro tickers. Each chip: ticker, price, change (green/red).
  - `MiniChart.tsx` — TradingView Lightweight Charts. Shows in right drawer when a holding row is clicked. 1D candle chart + volume.
- `src/renderer/pages/Settings.tsx` — portfolio config: add/edit/remove holdings (ticker, shares, cost basis)

### Verification
- `npm run dev` launches Electron with dark theme
- Sidebar navigates between pages (others show "Coming soon" placeholder)
- Terminal page shows portfolio with real yahoo-finance2 data
- Allocation donut renders and is interactive
- Holdings grid sorts correctly
- Macro bar shows real data
- Click a holding → right drawer opens with chart
- No TypeScript errors

---

## Agent 2: DATA
**Scope:** The Brain (Obsidian graph + AI chat) + The Inbox (Gmail × 3 + AI triage)
**Branch:** `data`
**Depends on:** Agent 1 must be merged to main first. Branch from main after merge.

### Part A: The Brain

#### 1. Vault parser
- `src/main/services/brain.ts`
  - Read all `.md` files recursively from vault path (env: `OBSIDIAN_VAULT_PATH`)
  - Default: `~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain/`
  - Parse YAML frontmatter (between `---` delimiters)
  - Extract `[[wikilinks]]` via regex: `/\[\[([^\]|\#]+)(?:\|[^\]]+)?\]\]/g`
  - Build graph: `{ nodes: [{id, title, type, area, path}], edges: [{source, target}] }`
  - File watcher: `chokidar.watch(vaultPath)` → rebuild graph on changes
  - Embedding indexer:
    - Chunk each note by H2 headers (or 500 tokens if no headers)
    - Call OpenAI `text-embedding-3-small` for each chunk
    - Store in `brain_notes` table (embedding as Float32Array → Buffer → BLOB)
    - Build on first launch, incremental on file changes
  - Search function: cosine similarity against query embedding, return top-K chunks

#### 2. Brain IPC
- `src/main/ipc/brain.ts`
  - `getGraph()` → full graph data (nodes + edges)
  - `getNote(path)` → raw markdown content of a note
  - `searchNotes(query)` → text search across note titles and content
  - `brainChat(message, history)` → RAG pipeline:
    1. Embed user message
    2. Top-10 similar chunks from brain_notes
    3. Build Claude prompt with chunks as context
    4. Stream response back
  - `getVaultStats()` → counts by type, recent, orphans

#### 3. Brain UI
- `src/renderer/pages/Brain.tsx` — layout: graph left (70%), right panel (30%)
- Components:
  - `KnowledgeGraph.tsx` — @antv/g6 force-directed graph
    - Node colors: hub=#3b82f6, person=#22d3ee, project=#22c55e, topic=#a855f7, document=#64748b, contact=#94a3b8
    - Node size: min 8px, scaled by link count (max 40px)
    - Edge color: #1a2a3a, opacity 0.3
    - Click node → load note in NoteViewer
    - Hover node → tooltip with title + type
    - Search bar: type to filter/highlight matching nodes
    - Zoom: scroll wheel + pinch. Fit-to-screen button.
    - Drag to pan, drag nodes to rearrange
  - `NoteViewer.tsx` — renders selected note as markdown (react-markdown + remark-gfm). Shows in right panel.
  - `BrainChat.tsx` — chat interface. Toggle between NoteViewer and Chat in right panel.
    - Input at bottom, messages scroll up
    - Streaming responses (token by token)
    - System prompt: "You are Coleman's second brain. You have perfect memory of all his notes, contacts, projects, and history. Answer as if you ARE his memory. Be specific — cite note titles and details."
    - Model toggle: Sonnet (fast) / Opus (deep) in chat header
  - `VaultStats.tsx` — small stats bar below graph: total notes, notes by type pie, recently modified count

### Part B: The Inbox

#### 4. Gmail auth helper
- `scripts/gmail-auth.ts`
  - Takes Google OAuth client_id + client_secret
  - Opens browser for consent for each account
  - Returns refresh tokens
  - Prints instructions for storing in app

#### 5. Email service
- `src/main/services/email.ts`
  - Initialize Gmail API client per account (using refresh tokens from safeStorage)
  - `syncAccount(accountId)`:
    - Fetch unread messages + last 48h messages
    - Parse: from, subject, snippet, date, threadId, hasAttachment
    - Upsert into `emails` table
  - `triageEmails(accountId)`:
    - For emails without importance_score:
    - Call Claude haiku: "Rate this email's importance 0-1 and explain why in <10 words. Sender: {from}, Subject: {subject}, Preview: {snippet}"
    - Store score + reason
  - `getTriageView()`:
    - For each account: return top 3 by importance_score DESC where is_unread=TRUE
  - `getAllEmails(filters)`:
    - Full inbox query with filters (account, unread, starred, search)

#### 6. Email IPC
- `src/main/ipc/email.ts`
  - `getTriageView()` → 3 arrays of top-3 emails
  - `getAllEmails(filters)` → paginated email list
  - `getEmailDetail(messageId, accountId)` → full email body (fetch from Gmail API on demand)
  - `markRead(messageId, accountId)` → mark as read in Gmail + local DB
  - `getAccountStatus()` → sync status per account

#### 7. Email UI
- `src/renderer/pages/Inbox.tsx` — layout: triage view default, toggle for full inbox
- Components:
  - `TriageView.tsx` — 3 columns side by side, each 33% width
    - Column header: account label + email + unread count
    - 3 EmailCards per column
  - `AccountColumn.tsx` — single column: header + list of EmailCards
  - `EmailCard.tsx` — card with:
    - Importance dot (red=urgent >0.8, yellow=important >0.5, blue=normal)
    - Sender name (bold) + time (muted, right-aligned)
    - Subject line (one line, truncated)
    - Preview snippet (2 lines, text-secondary)
    - Click → open EmailDetail in right drawer
  - `EmailDetail.tsx` — full email in right drawer. From, to, subject, date, full body (rendered HTML or plain text). "Mark as read" button.
  - Full inbox view: single list, all accounts, sortable/filterable

### Verification
- Brain: graph renders 300+ nodes at 60fps, click opens notes, chat answers questions about vault content
- Inbox: with valid Gmail credentials, shows top 3 emails per account with AI importance scores
- Both pages styled correctly with dark theme
- No TypeScript errors

---

## Agent 3: INTELLIGENCE
**Scope:** The Crew (agent infrastructure) + The Briefing (daily/weekly briefs)
**Branch:** `intelligence`
**Depends on:** Agent 1 must be merged. Ideally Agent 2 as well (for brain search + email data in briefings), but can stub those interfaces.

### Part A: The Crew

#### 1. Agent service
- `src/main/services/agents.ts`
  - Agent registry — each agent definition:
    ```typescript
    interface AgentDef {
      id: string;
      name: string;
      icon: string;
      description: string;
      systemPrompt: string;
      model: string; // claude-sonnet-4-6 or claude-opus-4-6
      tools: ToolDef[];
    }
    ```
  - Pre-built agents:
    - **🔍 Research** — "Research any topic and return a structured summary"
      - Tools: web_fetch (fetch URL + extract text), web_search (if available, otherwise instruct to use web_fetch on search engine)
      - Model: sonnet
    - **📊 Analyst** — "Analyze a stock, company, or deal"
      - Tools: get_quote (yahoo-finance2), get_macro (FRED), web_fetch
      - Model: sonnet
    - **✍️ Writer** — "Draft emails, memos, or documents with context from your brain"
      - Tools: brain_search (vector search the vault)
      - Model: opus
    - **📋 Planner** — "Plan your day/week based on emails, follow-ups, and projects"
      - Tools: get_triage_emails, brain_search
      - Model: sonnet
    - **🕵️ Monitor** — "Set up a background watch on a condition"
      - Tools: get_quote, web_fetch
      - Model: haiku (runs on schedule, cheap)
      - Stores conditions in SQLite, scheduler checks periodically
  - `runAgent(agentId, taskDescription, context?)`:
    - Build messages array with system prompt
    - Include tools
    - Call Claude API with streaming
    - Handle tool calls → execute → return results → continue
    - Stream assistant text tokens back via IPC
    - On completion: store in agent_tasks table

#### 2. Tool implementations
- `src/main/services/tools.ts`
  - `web_fetch(url)` — fetch URL, extract readable text (use basic HTML→text)
  - `brain_search(query)` — embed query, cosine search brain_notes, return top 5 chunks
  - `get_quote(ticker)` — yahoo-finance2 quote
  - `get_macro()` — current macro data
  - `get_triage_emails()` — top emails from email service

#### 3. Agent IPC
- `src/main/ipc/agents.ts`
  - `getAgents()` → list of agent definitions
  - `runTask(agentId, description)` → start task, return task ID, stream results
  - `getTaskHistory(limit)` → recent tasks
  - `getTaskResult(taskId)` → full result

#### 4. Agent UI
- `src/renderer/pages/Crew.tsx` — layout: agent grid top, task area bottom
- Components:
  - `AgentGrid.tsx` — row of agent cards (horizontal scroll or grid)
  - `AgentCard.tsx` — icon, name, description, click to select
  - `TaskRunner.tsx` — selected agent's task interface
    - Text input: "What do you want [agent] to do?"
    - Optional context toggle (attach brain notes, email, portfolio)
    - Run button → streaming output panel
    - Output renders as markdown
  - `TaskQueue.tsx` — sidebar or bottom panel: list of recent tasks with status badges
  - `ResultsFeed.tsx` — scrollable activity feed of completed tasks

### Part B: The Briefing

#### 5. Briefing service
- `src/main/services/briefing.ts`
  - `generateDailyBrief()`:
    - Gather: portfolio data (prices, moves), top emails (triage view), brain follow-ups (search for "follow-up" or "TODO")
    - Claude prompt: structured template (see SPEC.md briefing format)
    - Store in briefings table
  - `generateWeeklyBrief()`:
    - Gather: week's portfolio performance, emails handled, tasks completed, brain changes
    - Claude prompt: weekly summary template
    - Store in briefings table
  - Schedule via node-cron:
    - Daily: `0 7 * * *` (7:00 AM PT)
    - Weekly: `0 20 * * 0` (Sunday 8:00 PM PT)

#### 6. Briefing IPC
- `src/main/ipc/briefing.ts`
  - `getLatestBrief(type)` → most recent daily or weekly
  - `getBriefHistory(type, limit)` → past briefings
  - `regenerateBrief(type)` → force regenerate now

#### 7. Briefing UI
- `src/renderer/pages/Briefing.tsx` — layout: current brief center, archive sidebar
- Components:
  - `DailyBrief.tsx` — renders today's brief as styled markdown. "Regenerate" button.
  - `WeeklyBrief.tsx` — renders weekly brief.
  - `BriefArchive.tsx` — list of past briefings, click to view.
  - Tab toggle: Daily / Weekly at top.

### Verification
- Crew: can select an agent, type a task, see streaming response with tool use
- Briefing: can generate and view a daily brief
- Task history persists across app restarts
- All styled with dark theme
- No TypeScript errors

---

## Git Workflow

1. Each agent works on their own branch
2. Jarvis reviews and merges into `main`
3. **Agent 1 (foundation) goes first** — must merge before Agents 2 and 3 start
4. **Agents 2 and 3 run in parallel** after foundation merges
5. Final integration merge at the end

```
foundation → main
                ↓
    data → main  (parallel)
    intelligence → main  (parallel)
                ↓
         Final QA + polish
```

---

## What NOT To Do

- Don't use Next.js or any server framework
- Don't create a web app — this is Electron
- Don't use React Router DOM — use simple state-based routing
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
