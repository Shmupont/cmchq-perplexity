# CMC HQ — Homescreen Plan
> iOS-style app launcher. Each tile is a mini-app. No emojis. No bullshit. Clean.

---

## The Concept

The home screen IS the app. When you open CMC HQ, you see a dark, premium grid of app tiles — like an iPhone home screen but for your life. Each tile shows one live data point or visual. Click any tile → it opens into a full mini-app experience. Press Escape or click back → return to the grid.

No sidebar navigation. No tabs. The grid IS the navigation.

---

## Visual Language

- **No emojis anywhere** — use minimal monochrome icons (Lucide or custom SVG)
- **No logos** — text labels only, small, lowercase
- **Typography-driven** — the data IS the design
- **Cards:** rounded corners (12px), subtle border (#1a2a3a), glass-morphism effect (subtle blur + transparency)
- **Grid:** 3 columns × 3 rows (9 tiles max), centered, generous spacing
- **Background:** deep navy (#04080f) with a very subtle animated gradient or particle field
- **Tile hover:** gentle lift (translateY -2px) + border glow (#3b82f6 at 20% opacity)
- **Tile click:** scale down slightly (0.98) then expand into full-screen mini-app (smooth 300ms transition)

Think: Apple TV home screen meets Bloomberg terminal meets a $10M hedge fund dashboard.

---

## The Tiles (v1 — 8 apps)

### 1. brain
**Card preview:** Miniature knowledge graph rendering (live, slowly rotating, nodes glowing)
**Data point:** "358 nodes" (bottom-right, muted)
**Mini-app:** Full interactive Obsidian graph + note viewer + search
**Size:** Large tile (spans 2 columns, top-left)

### 2. portfolio
**Card preview:** Total portfolio value in large JetBrains Mono, daily P&L underneath (green/red)
**Data point:** "$XX,XXX" total (INCLUDES cash balance — $13,656 ML Bank Deposit)
**Mini-app:** Full terminal — allocation donut, holdings grid, macro bar, charts
**Size:** Standard tile

### 3. inbox
**Card preview:** 3 stacked email previews (one per account), just sender + subject, truncated
**Data point:** Unread count badge (top-right corner of tile)
**Mini-app:** Full triage view + full inbox + email detail
**Size:** Standard tile

### 4. jarvis
**Card preview:** Last message exchange (2 lines — your question, my answer), subtle typing indicator animation
**Data point:** "online" status dot (green)
**Mini-app:** Full OpenClaw TUI — chat with Jarvis directly. WebSocket connection to OpenClaw gateway at ws://127.0.0.1:18789. Renders markdown responses, supports streaming.
**Size:** Standard tile

### 5. briefing
**Card preview:** Today's date + 3 bullet headlines from the morning brief
**Data point:** "7:00am" generation timestamp
**Mini-app:** Full daily/weekly briefing with archive
**Size:** Standard tile

### 6. wsj
**Card preview:** Latest headline + publication time
**Data point:** "LIVE" indicator when new story in last 30 min
**Mini-app:** Rolling news feed from WSJ/financial news sources. Each story has a "30s brief" button that generates a voice summary via TTS. Auto-alerts: when a major story breaks, the tile pulses and a notification sound plays. Voice briefing plays through system audio.
**Size:** Standard tile

### 7. crew
**Card preview:** Row of agent icons with status dots (idle/running/done)
**Data point:** Active tasks count
**Mini-app:** Agent grid, task runner, results feed
**Size:** Standard tile

### 8. calendar
**Card preview:** Next upcoming event (title + time)
**Data point:** "Nothing today" or event countdown
**Mini-app:** Day/week view pulled from Google Calendar API (future — placeholder for now)
**Size:** Standard tile (bottom-right)

---

## Grid Layout

```
┌─────────────────────┬───────────┐
│                     │           │
│      brain          │ portfolio │
│   (2-col wide)      │           │
│                     │           │
├───────────┬─────────┼───────────┤
│           │         │           │
│   inbox   │ jarvis  │ briefing  │
│           │         │           │
│           │         │           │
├───────────┼─────────┼───────────┤
│           │         │           │
│    wsj    │  crew   │ calendar  │
│           │         │           │
│           │         │           │
└───────────┴─────────┴───────────┘
```

---

## Tile → Mini-App Transition

1. User clicks tile
2. Tile scales to 0.97 (50ms)
3. Other tiles fade out (150ms)
4. Clicked tile expands to fill the window (300ms, ease-out-cubic)
5. Mini-app content fades in (200ms)
6. Back button appears (top-left) — or Escape key

Reverse: mini-app shrinks back to tile position, other tiles fade in.

This should feel like opening an app on iPad — fluid, spatial, satisfying.

---

## Mini-App Architecture

Each mini-app is a self-contained React component that receives the full window space:

```typescript
interface MiniApp {
  id: string;
  label: string;                    // lowercase, no emoji
  icon: React.FC<IconProps>;        // Lucide icon or custom SVG
  TilePreview: React.FC;            // what shows on the home grid
  FullApp: React.FC;                // the expanded mini-app
  badge?: () => string | number;    // optional badge (unread count, etc.)
  liveData?: () => TileData;        // real-time data for the tile preview
}
```

Registry:
```typescript
const apps: MiniApp[] = [
  brainApp,
  portfolioApp,
  inboxApp,
  jarvisApp,
  briefingApp,
  wsjApp,
  crewApp,
  calendarApp,
];
```

---

## System 6: Jarvis (OpenClaw TUI)

### What It Does
Direct chat with Jarvis (me) from inside the dashboard. Full OpenClaw TUI experience embedded.

### Technical
- WebSocket connection to OpenClaw gateway: `ws://127.0.0.1:18789`
- Use the OpenClaw webchat protocol (same as the Control UI)
- Renders markdown responses
- Supports streaming (token by token)
- Message history persists in local SQLite
- Input: text box at bottom, send on Enter
- Display: scrolling message list, alternating alignment (user right, jarvis left)

### Why It's Special
This is the only tile that connects to a LIVE agent outside the app. Brain chat is RAG-only. Jarvis is the real deal — connected to everything (exec, browser, web, files, memory).

---

## System 7: WSJ Portal

### What It Does
Financial news feed with AI voice briefings.

### Components

#### 7.1 — News Feed
- Source: RSS feeds from WSJ, Bloomberg, Reuters, Financial Times (free RSS endpoints)
- Fallback: Finnhub news API (free tier)
- Refresh: every 5 min
- Display: scrolling list of headlines with source, time, 2-line preview
- Click headline → full article view (fetched via web scrape or readability extraction)
- Filter: by source, by topic (markets, tech, macro)

#### 7.2 — Voice Briefing
- Each story has a "brief me" button
- Click → Claude summarizes the article in 3-4 sentences
- Summary sent to TTS (OpenAI TTS or system speech synthesis)
- Audio plays through system speakers
- 30 seconds max per briefing

#### 7.3 — Breaking Alerts
- When a story from the last 30 min matches portfolio holdings or key topics:
  - Tile pulses on home screen
  - Optional: system notification
  - Story auto-pinned to top of feed

### Data Sources
- WSJ RSS: `https://feeds.a.dj.com/rss/RSSMarketsMain.xml`
- Reuters RSS: `https://www.rss.reuters.com/news/businessNews`
- Finnhub news API (backup)
- Claude for summarization
- OpenAI TTS (`tts-1`, voice: "onyx") or macOS `say` command for voice

---

## Implementation Plan

### Phase 1: Current agents finish their work
- Agent 1 builds Terminal + shell (sidebar nav for now)
- Agent 2 builds Brain + Inbox
- Agent 3 builds Crew + Briefing
- Everything works with sidebar nav initially

### Phase 2: Homescreen conversion (after all agents merge)
- Replace sidebar nav with grid homescreen
- Each existing page becomes a mini-app FullApp component
- Build tile previews for each (live data)
- Build the tile → mini-app transition animation
- Add Home.tsx as the new default page

### Phase 3: New mini-apps
- Jarvis tile (OpenClaw WebSocket integration)
- WSJ tile (RSS + voice briefing)
- Calendar tile (Google Calendar API — or placeholder)

### Phase 4: UI polish pass
- Perplexity-level polish on every component
- Glass-morphism on tiles
- Micro-animations everywhere
- Typography audit (consistent sizing, spacing, weights)
- Performance: 60fps on home screen with live brain graph

---

## What This Is NOT

- Not a web app — Electron desktop
- Not a clone of anything — this is Coleman's personal operating system
- Not trying to be "enterprise" — built for one person, maximum data density
- Not using emoji — ever
- Not using stock icons — custom or Lucide only, monochrome

---

## Cash in Portfolio Total

The portfolio tile and Terminal mini-app MUST include the CASH holding ($13,656 ML Bank Deposit) in the total portfolio value. The number on the tile should be total assets under management, not just equity positions.

---

*"I don't want a dashboard. I want a cockpit."*
