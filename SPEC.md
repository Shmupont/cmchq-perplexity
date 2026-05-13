# CMC HQ — Master Spec
> Personal command center. Built for one. Looks like Bloomberg had a baby with Jarvis.

**Version:** 0.1 — Initial Spec
**Author:** Coleman Dupont + Jarvis
**Date:** 2026-05-13

---

## What This Is

An Electron desktop app that is Coleman's personal headquarters. Not a tool — a cockpit. Everything Coleman needs to see, know, and do lives in one window with elite dark visuals.

Five core systems in one shell:

1. **The Brain** — Interactive Obsidian knowledge graph + AI assistant trained on it
2. **The Terminal** — Bloomberg-grade portfolio dashboard from CMC data
3. **The Inbox** — Unified email view across 3 accounts, AI-triaged
4. **The Crew** — Agent infrastructure: a team of Claude agents Coleman can deploy
5. **The Briefing** — Daily/weekly intelligence briefings auto-generated from all data

---

## Why This Exists

- Coleman is building Mager OS for Mark — this is the same thing, but for himself
- Reps on the tech stack before the summer (FastAPI, Claude agents, MCP, Electron)
- A real product Coleman uses every day — dogfooding agentic systems
- Portfolio of what one person can build with AI

---

## Visual Design

### Color Palette (inherited from Mission Control)
```
Background:       #04080f   (deep navy black)
Surface:          #0a1018   (card background)
Surface-elevated: #0f1623   (modals, floating panels)
Border:           #1a2a3a   (subtle)
Border-active:    #2a4060   (focused elements)

Accent Blue:      #3b82f6   (primary actions)
Accent Blue-2:    #60a5fa   (hover states)
Accent Cyan:      #22d3ee   (data highlights)

Positive:         #22c55e   (green — gains, success)
Negative:         #ef4444   (red — losses, errors)
Warning:          #f59e0b   (amber)
Muted:            #64748b   (secondary text)

Text Primary:     #e2e8f0
Text Secondary:   #94a3b8
Text Muted:       #475569

Font UI:          Inter
Font Numbers:     JetBrains Mono
Font Headers:     Inter (600 weight)
```

### Design Principles
- Bloomberg terminal meets sci-fi HUD
- Dark, dense, information-rich — no wasted space
- Monospace numbers everywhere for alignment
- Green/red strictly for positive/negative values
- Smooth 200ms transitions
- Carbon fiber textures on cards (from SWARM aesthetic)
- Glow effects on active/focused elements
- RGB accent lines on section dividers

---

## Architecture

### App Shell
```
Electron 28+ (electron-vite)
├── Main Process (Node.js)
│   ├── IPC handlers for each system
│   ├── Background services (email sync, portfolio refresh, agent runner)
│   ├── Local SQLite database (better-sqlite3)
│   └── Claude API client
├── Renderer Process (React 18 + TypeScript)
│   ├── Layout: sidebar nav + main panel + optional right drawer
│   ├── Pages: Brain, Terminal, Inbox, Crew, Briefing, Settings
│   ├── State: Zustand
│   └── Styling: TailwindCSS + custom theme
└── Preload scripts for secure IPC
```

### Backend Services (running in main process)
```
services/
├── portfolio.ts      — yahoo-finance2, portfolio data, P&L calculations
├── email.ts          — Gmail API (OAuth2) for 3 accounts
├── brain.ts          — Obsidian vault reader + vector embeddings
├── agents.ts         — Claude agent orchestration
├── briefing.ts       — Daily/weekly briefing generator
├── scheduler.ts      — node-cron for refresh cycles
└── db.ts             — SQLite database
```

---

## System 1: The Brain

### What It Does
Interactive knowledge graph rendered from Coleman's Obsidian vault, with an AI assistant that's been trained on every note.

### Components

#### 1.1 — Knowledge Graph View
- Read the Obsidian vault from disk (iCloud Drive path)
- Parse all `.md` files, extract `[[wikilinks]]`, frontmatter metadata
- Render as an interactive force-directed graph using `d3-force` or `@antv/g6`
- Node colors based on `type:` frontmatter (hub=blue, person=cyan, project=green, etc.)
- Node size based on link count (more connected = bigger)
- Click a node → slide-in panel shows the full note rendered as markdown
- Search bar to filter/highlight nodes
- Zoom zones: hover over a cluster to see it labeled (Family, Finance, School, etc.)
- File watcher: auto-refresh when vault changes on disk

#### 1.2 — Brain AI (Virtual Coleman)
- On first launch + periodically: index the entire vault into vector embeddings
- Embedding model: `text-embedding-3-small` (OpenAI)
- Store vectors in local SQLite with `sqlite-vss` or a simple cosine similarity search
- Chat interface in a right-side drawer
- System prompt: "You are Coleman's second brain. You have access to all of Coleman's notes, contacts, projects, conversations, and history. Answer questions as if you ARE Coleman's memory."
- Every user message: retrieve top-10 relevant chunks → inject as context → Claude response
- Model: `claude-sonnet-4-6` (fast) or `claude-opus-4-6` (deep thinking — user toggle)

#### 1.3 — Vault Stats Bar
- Total notes count
- Notes by type (pie chart)
- Recently modified (last 24h)
- Orphan notes (no links)
- Most connected nodes

### Data Source
- Path: `~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain/`
- Fallback path: configurable in settings
- Read-only (don't write to the vault from the app — Obsidian owns the files)

---

## System 2: The Terminal (Portfolio Dashboard)

### What It Does
Bloomberg-grade view of Coleman's Merrill Lynch portfolio. Real-time prices, allocation, P&L, signals.

### Components

#### 2.1 — Portfolio Overview
- Total portfolio value (big number, top center)
- Daily P&L (green/red)
- 1W / 1M / 3M / YTD / 1Y performance
- Allocation donut chart (interactive — hover for details)
  - Sectors: Tech, Healthcare, Financials, Energy, Real Estate, etc.
  - Color-coded by sector

#### 2.2 — Holdings Grid
| Ticker | Name | Shares | Price | Day Chg | P&L | Weight | Signal |
- Sortable columns
- Click row → TradingView mini chart + AI analysis panel
- Signal dot: green (bullish), red (bearish), gray (neutral) — from briefing system

#### 2.3 — ETF Drill-Down
- Click any ETF → see top 10 underlying holdings
- Each constituent shows: weight, day change, 52w range sparkline
- Inherited from Mission Control's existing ETF drill-down

#### 2.4 — Macro Bar (bottom ticker)
- S&P 500, NASDAQ, DJI, 10Y yield, VIX, BTC, ETH
- Fed Funds Rate, CPI (from FRED API)
- Scrolling ticker or fixed chips

### Data Sources
- `yahoo-finance2` — real-time prices (free)
- FRED API — macro data (free, needs key)
- TradingView Lightweight Charts v4 — charting
- Portfolio holdings: stored in SQLite (user configures shares + cost basis)
- Refresh: every 5 min during market hours (M-F 6:30am-1:00pm PT)

### Portfolio Config
```json
{
  "holdings": [
    { "ticker": "SHV", "shares": 100, "costBasis": 110.50 },
    { "ticker": "VGT", "shares": 50, "costBasis": 480.00 },
    { "ticker": "AAPL", "shares": 25, "costBasis": 175.00 },
    { "ticker": "GOOGL", "shares": 15, "costBasis": 140.00 }
  ]
}
```
*Coleman fills in actual positions on first launch.*

---

## System 3: The Inbox

### What It Does
Unified email dashboard across 3 Gmail accounts, AI-triaged every morning.

### Accounts
1. `colemandski@gmail.com` — personal
2. `colemansdupont@gmail.com` — business/SWARM
3. `colemandupont@ucsb.edu` — school

### Components

#### 3.1 — Triage View (default)
- Three columns, one per account
- Each column shows top 3 most important/pressing emails
- Importance ranked by Claude AI:
  - Sender importance (known contact? boss? school?)
  - Time sensitivity (deadline mentioned? meeting today?)
  - Action required (needs response vs. FYI)
- Each email card: sender, subject, 2-line preview, importance badge, time
- Click → full email in a modal with AI-suggested reply

#### 3.2 — Full Inbox View
- Toggle to see all unread across all accounts
- Search across all accounts
- Filter: account, read/unread, starred, has attachment
- Thread view for conversations

#### 3.3 — Morning Briefing Email
- Auto-generated every morning at 7:00 AM PT
- "Here's what needs your attention today" across all 3 inboxes
- Ties into System 5 (Briefing)

### Technical
- Gmail API via OAuth2 (3 separate auth flows)
- Credentials stored in Electron's safeStorage (encrypted at rest)
- Sync: full sync on launch, then incremental every 5 min
- AI triage: run on new emails, cache importance scores in SQLite
- Model for triage: `claude-haiku` (fast, cheap, just classification)

### Gmail OAuth Setup
1. Google Cloud Console → enable Gmail API
2. Create OAuth 2.0 credentials (Desktop app type)
3. First launch → browser auth flow for each account
4. Refresh tokens stored in safeStorage

---

## System 4: The Crew (Agent Infrastructure)

### What It Does
A team of Claude agents Coleman can deploy for tasks. Like having a virtual staff.

### Architecture
```
Crew Manager
├── Agent Registry (who's available)
├── Task Queue (what needs doing)
├── Execution Engine (runs agents)
└── Results Feed (what they found/did)
```

### Pre-Built Agents

#### 🔍 Research Agent
- "Research [topic] and give me a summary"
- Web search + synthesis
- Outputs: structured markdown report
- Tools: web search, web fetch, summarize

#### 📊 Analysis Agent
- "Analyze [ticker/company/deal]"
- Financial data lookup + analysis
- Outputs: investment thesis, bull/bear case, key metrics
- Tools: yahoo-finance, FRED, web search

#### ✍️ Writer Agent
- "Draft an email to [person] about [topic]"
- "Write a memo on [subject]"
- Context-aware: pulls from Brain data for relevant background
- Tools: brain search, email templates

#### 📋 Planner Agent
- "Plan my week" / "What should I focus on today?"
- Reads: calendar, emails, follow-ups, active projects
- Outputs: prioritized task list

#### 🕵️ Monitor Agent
- Background agent that watches for things
- "Alert me if [ticker] drops below [price]"
- "Watch for emails from [person]"
- Runs on a schedule, fires notifications

### Components

#### 4.1 — Agent Panel
- Grid of agent cards (icon, name, description, status)
- Click → open task interface
- Input: natural language task description
- Optional: attach context (brain notes, emails, portfolio data)
- Run button → agent executes, shows streaming output

#### 4.2 — Task Queue
- List of active/completed/failed tasks
- Each task: agent, description, status, result, timestamp
- Click completed task → see full output

#### 4.3 — Results Feed
- Activity feed of everything agents have done
- Searchable, filterable
- Export results as markdown

### Technical
- Claude API with tool use
- Each agent: system prompt + allowed tools + optional MCP servers
- Execution: run in main process, stream results to renderer via IPC
- Model: `claude-sonnet-4-6` default, `claude-opus-4-6` for complex tasks
- Tool implementations in TypeScript (main process)

---

## System 5: The Briefing

### What It Does
Daily and weekly intelligence briefings auto-generated from ALL data sources.

### Daily Briefing (7:00 AM PT)
Generated from:
- Portfolio: overnight moves, pre-market signals
- Emails: top urgent across all 3 accounts
- Calendar: today's events (if integrated)
- Brain: any follow-ups due today
- Market: macro events, sector moves

Format:
```
🌅 Morning Brief — May 14, 2026

PORTFOLIO
↑ VGT +1.2% (tech rally on AAPL earnings beat)
↓ VDE -0.8% (oil inventory surprise)
Total: $XX,XXX (+$XXX today)

EMAILS (need response)
📧 Mark Mager — "Updated deck review" (2h ago)
📧 UCSB Registrar — "Fall enrollment deadline" (urgent)
📧 Tim Rice — "Monthly wire confirmation" (FYI)

TODAY
📅 No calendar events
📋 Follow up: Mark Mager business email
📋 Follow up: Dan meeting status

MARKET
S&P: 5,450 (+0.3%) | 10Y: 4.25% | VIX: 14.2
Fed minutes at 2pm ET — watch for rate guidance
```

### Weekly Briefing (Sunday 8:00 PM PT)
- Week in review: portfolio performance, key emails handled, tasks completed
- Week ahead: upcoming deadlines, meetings, follow-ups
- Brain growth: new notes added this week, connections formed

### Components
- Full-page briefing view with scroll
- Archive of past briefings
- "Regenerate" button to refresh
- Share button (copy as markdown)

---

## Layout

### Sidebar Navigation (left, collapsed by default — icons only)
```
🏠  Home
🧠  Brain
📊  Terminal
📧  Inbox
🤖  Crew
📋  Briefing
⚙️  Settings
```

### Home Page (default landing)
The first thing Coleman sees when the app opens. NOT a blank dashboard — a living cockpit.

**Layout:**
- **Top half:** Interactive Obsidian brain graph (same renderer as Brain page, but zoomed out, auto-rotating slowly, ambient glow). Click any node → navigates to Brain page with that note selected.
- **Bottom half:** 3-column quick glance:
  - Left: Portfolio summary (total value, daily P&L, top 3 movers)
  - Center: Today's briefing (condensed — 5 bullet max)
  - Right: Email triage (top 1 urgent per account, 3 total)
- **Ambient vibe:** The graph pulses subtly. Nodes glow brighter for recently modified notes. The whole thing feels alive.

This page is the reason the app exists. It should look like mission control at NASA.

### Main Panel
- Full width minus sidebar
- Each page is its own component
- Smooth page transitions (slide or fade)

### Right Drawer (optional, context-sensitive)
- Brain AI chat
- Agent task runner
- Email detail view
- Opens/closes with animation

---

## Database Schema (SQLite)

```sql
-- Portfolio
CREATE TABLE holdings (
  id INTEGER PRIMARY KEY,
  ticker TEXT NOT NULL,
  shares REAL NOT NULL,
  cost_basis REAL NOT NULL,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_cache (
  ticker TEXT NOT NULL,
  price REAL,
  day_change REAL,
  day_change_pct REAL,
  volume BIGINT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email
CREATE TABLE email_accounts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  label TEXT NOT NULL, -- 'personal', 'business', 'school'
  refresh_token_encrypted BLOB,
  last_sync_at TEXT
);

CREATE TABLE emails (
  id TEXT PRIMARY KEY, -- Gmail message ID
  account_id INTEGER REFERENCES email_accounts(id),
  from_address TEXT,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  date TEXT,
  is_unread BOOLEAN DEFAULT TRUE,
  is_starred BOOLEAN DEFAULT FALSE,
  importance_score REAL, -- AI-scored 0-1
  importance_reason TEXT,
  thread_id TEXT,
  has_attachment BOOLEAN DEFAULT FALSE
);

-- Brain
CREATE TABLE brain_notes (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  type TEXT, -- from frontmatter
  area TEXT, -- from frontmatter
  links_out TEXT, -- JSON array of linked note paths
  embedding BLOB, -- vector embedding
  indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Agents
CREATE TABLE agent_tasks (
  id INTEGER PRIMARY KEY,
  agent_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  input TEXT, -- JSON
  output TEXT, -- markdown result
  model TEXT DEFAULT 'claude-sonnet-4-6',
  tokens_used INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Briefings
CREATE TABLE briefings (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL, -- 'daily', 'weekly'
  content TEXT NOT NULL,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Signals
CREATE TABLE signals (
  id INTEGER PRIMARY KEY,
  ticker TEXT,
  signal_type TEXT,
  summary TEXT,
  details TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Project Structure

```
cmchq/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── SPEC.md
├── BUILD.md                    # Build instructions for Claude Code
│
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts            # App entry, window creation
│   │   ├── ipc/                # IPC handlers
│   │   │   ├── brain.ts
│   │   │   ├── portfolio.ts
│   │   │   ├── email.ts
│   │   │   ├── agents.ts
│   │   │   └── briefing.ts
│   │   ├── services/           # Backend services
│   │   │   ├── portfolio.ts
│   │   │   ├── email.ts
│   │   │   ├── brain.ts
│   │   │   ├── agents.ts
│   │   │   ├── briefing.ts
│   │   │   ├── scheduler.ts
│   │   │   └── db.ts
│   │   └── preload.ts
│   │
│   └── renderer/               # React frontend
│       ├── App.tsx
│       ├── index.html
│       ├── pages/
│       │   ├── Brain.tsx       # Knowledge graph + AI chat
│       │   ├── Terminal.tsx    # Portfolio dashboard
│       │   ├── Inbox.tsx       # Email triage
│       │   ├── Crew.tsx        # Agent management
│       │   ├── Briefing.tsx    # Daily/weekly briefs
│       │   └── Settings.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── RightDrawer.tsx
│       │   │   └── TopBar.tsx
│       │   ├── brain/
│       │   │   ├── KnowledgeGraph.tsx
│       │   │   ├── BrainChat.tsx
│       │   │   ├── NoteViewer.tsx
│       │   │   └── VaultStats.tsx
│       │   ├── terminal/
│       │   │   ├── PortfolioOverview.tsx
│       │   │   ├── HoldingsGrid.tsx
│       │   │   ├── AllocationDonut.tsx
│       │   │   ├── MacroBar.tsx
│       │   │   └── MiniChart.tsx
│       │   ├── inbox/
│       │   │   ├── TriageView.tsx
│       │   │   ├── EmailCard.tsx
│       │   │   ├── EmailDetail.tsx
│       │   │   └── AccountColumn.tsx
│       │   ├── crew/
│       │   │   ├── AgentGrid.tsx
│       │   │   ├── AgentCard.tsx
│       │   │   ├── TaskRunner.tsx
│       │   │   ├── TaskQueue.tsx
│       │   │   └── ResultsFeed.tsx
│       │   └── briefing/
│       │       ├── DailyBrief.tsx
│       │       ├── WeeklyBrief.tsx
│       │       └── BriefArchive.tsx
│       ├── hooks/
│       │   ├── usePortfolio.ts
│       │   ├── useBrain.ts
│       │   ├── useEmail.ts
│       │   ├── useAgents.ts
│       │   └── useBriefing.ts
│       ├── stores/
│       │   └── appStore.ts     # Zustand
│       └── styles/
│           ├── globals.css
│           └── theme.ts
│
├── resources/                  # App icons, assets
└── scripts/
    └── gmail-auth.ts           # OAuth helper
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Shell | Electron 28+ | Desktop app, file system access, native feel |
| Build | electron-vite | Fast builds, HMR |
| Frontend | React 18 + TypeScript | Component model, ecosystem |
| Styling | TailwindCSS + custom theme | Rapid styling, dark theme |
| Charts | TradingView Lightweight Charts v4 | Finance-grade charts |
| Graph | @antv/g6 or d3-force | Knowledge graph rendering |
| State | Zustand | Simple, performant |
| Database | better-sqlite3 | Local, fast, no server needed |
| Market Data | yahoo-finance2 | Free, reliable |
| Macro Data | FRED API | Free, comprehensive |
| Email | Gmail API (googleapis) | OAuth2, all 3 accounts |
| AI | Anthropic Claude API | Agents, triage, briefings, brain chat |
| Embeddings | OpenAI text-embedding-3-small | Cheap, good quality |
| Markdown | react-markdown + remark-gfm | Render vault notes |
| Scheduling | node-cron | Refresh cycles, briefing generation |
| Encryption | Electron safeStorage | OAuth tokens at rest |

---

## API Keys Required

| Service | Key | Status |
|---------|-----|--------|
| Anthropic | Claude API | ✅ Have it |
| OpenAI | Embeddings + Copilot | ✅ Have it (sk-proj-...dKQA) |
| Google | Gmail API OAuth | ❓ Need to set up (3 accounts) |
| FRED | Macro data | ❓ Free, need to register |
| Finnhub | News (optional) | ❓ Free tier |

---

## Build Phases

### Phase 1: Shell + Terminal (Week 1)
- Electron scaffold with electron-vite
- Sidebar navigation
- Portfolio dashboard (reuse Mission Control patterns)
- SQLite database
- Dark theme + design system
- **Deliverable:** Working app with portfolio view

### Phase 2: Brain (Week 1-2)
- Obsidian vault parser (read .md files, extract links + frontmatter)
- Knowledge graph renderer
- Vector embeddings of all notes
- Brain AI chat with RAG
- **Deliverable:** Interactive brain with AI assistant

### Phase 3: Inbox (Week 2-3)
- Gmail OAuth flow for 3 accounts
- Email sync service
- AI triage (importance scoring)
- Triage view UI
- **Deliverable:** Unified inbox with AI ranking

### Phase 4: Crew (Week 3-4)
- Agent definitions (research, analysis, writer, planner, monitor)
- Task runner with streaming output
- Task queue + results feed
- **Deliverable:** Working agent team

### Phase 5: Briefing + Polish (Week 4-5)
- Daily/weekly briefing generation
- Briefing UI
- Cross-system connections (briefing pulls from all systems)
- Animations, transitions, final visual polish
- **Deliverable:** Complete app

---

## Environment Variables

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Gmail OAuth (per account)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# Optional
FRED_API_KEY=...
FINNHUB_API_KEY=...

# Paths
OBSIDIAN_VAULT_PATH=~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain

# App
NODE_ENV=development
```

---

## Constraints

1. **Read-only on Obsidian vault** — never write to it, only read
2. **No sending emails** without explicit user confirmation
3. **All credentials encrypted** at rest via Electron safeStorage
4. **Offline-capable** for brain + portfolio cache (email needs network)
5. **Single user** — no auth, no multi-tenant, built for Coleman
6. **Mac only** — Electron but only targeting macOS (ARM64)

---

## Success Criteria

- [ ] App launches in <3 seconds
- [ ] Portfolio data refreshes automatically during market hours
- [ ] Brain graph renders 350+ nodes smoothly at 60fps
- [ ] Brain AI answers questions about Coleman's notes accurately
- [ ] Emails triaged correctly >80% of the time
- [ ] Agents complete basic tasks (research, draft, analyze)
- [ ] Daily briefing generates automatically at 7am
- [ ] Looks like it cost $500k to build

---

*"Make it look like I have a team of 50. Because I do — they're just all Claude."*
