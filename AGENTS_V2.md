# AGENTS V2 — Visual Overhaul Sprint

> All API keys are wired in `.env`. Foundation is built. This sprint is about making every tile look like a $500K custom dashboard.
> 
> **Repo:** `github.com/Shmupont/cmchq-perplexity`  
> **Branch:** `ui-jarvis-redesign`  
> **Read first:** `VISUAL_OVERHAUL.md` for the full visual spec.  
> **Reference file:** `src/renderer/src/components/terminal/PortfolioTileHud.tsx` — THIS is the quality bar. Every tile should match this level.

---

## Rules (ALL agents)

1. **Only touch `src/renderer/`** — do NOT modify backend services, IPC, or main process files
2. **Canvas + SVG for custom graphics** — use `requestAnimationFrame` for smooth 60fps canvas animations
3. **Glassmorphism everywhere** — `backdrop-blur-xl bg-white/[0.03] border border-white/[0.06]`
4. **JetBrains Mono for all numbers** — prices, counts, timestamps, percentages
5. **No emojis** — use Lucide icons only (already installed: `lucide-react`)
6. **Color palette from `tailwind.config.js`** — don't invent new colors
7. **200ms transitions on all interactive elements**
8. **Every tile has TWO components:** a `TilePreview` (shown on home grid) and a `FullApp` (shown when tile is opened). Both need to look premium.
9. **Test:** `npm run dev` must launch without errors. No TypeScript errors.

---

## Agent 1: INBOX + CALENDAR

**Branch off:** `ui-jarvis-redesign`  
**Your branch:** `visual-inbox-calendar`

### Inbox — Radar Ring Tile

**File:** `src/renderer/src/apps/inbox.tsx` (TilePreview component)  
**New file:** `src/renderer/src/components/inbox/InboxRadar.tsx`

Build a radar/sonar ring visualization for the inbox tile preview:

- **3 concentric rings** drawn on a `<canvas>` element
  - Inner ring: urgent emails (importance > 0.8) — red dots, pulsing glow
  - Middle ring: important emails (importance > 0.5) — amber dots
  - Outer ring: normal emails — blue dots, static
- **3 arc segments** on the rings = 3 accounts (Personal / Business / School)
  - Personal: 0°-120° zone, subtle blue tint
  - Business: 120°-240° zone, subtle cyan tint
  - School: 240°-360° zone, subtle purple tint
- Each **dot = one unread email**, positioned on its ring within its account's arc
- **Center:** total unread count in large JetBrains Mono (white)
- **Radar sweep:** a faint cyan line rotates clockwise (one full rotation every 8 seconds), with a trailing gradient fade
- **Animation:** `requestAnimationFrame` loop, smooth 60fps
- Canvas should resize with container (use `ResizeObserver`)

**Data:** Call `window.api.email.getTriageView()` — returns 3 arrays of emails with `importance_score`. If no accounts connected yet, show the radar with 0 dots and "connect accounts" text in center.

**Full app improvements:** `src/renderer/src/pages/Inbox.tsx`
- Add AI triage summary bar at top: "X urgent · Y important · Z routine" with colored dots
- Each account column header: account email + unread badge + mini category donut (tiny, 30px)
- Email cards: glowing left-border by importance (red/amber/blue), sender bold, time in mono

### Calendar — Mini Month Tile

**File:** `src/renderer/src/apps/calendar.tsx` (TilePreview + FullApp)  
**New file:** `src/renderer/src/components/calendar/MiniMonth.tsx`  
**New file:** `src/renderer/src/components/calendar/DayTimeline.tsx`

**Tile preview:**
- Mini month grid: 7 columns (S M T W T F S), ~5 rows of day numbers
- Today: cyan circle highlight with subtle glow
- Past days: text-muted, future days: text-secondary
- Current time shown below grid: `HH:MM` in JetBrains Mono with a blinking colon
- If events exist (future): small colored dots under days that have events

**Full app:**
- Day timeline view (default): vertical axis with hour markers (6am-11pm)
- Events as glass cards positioned at their time slot
- Week toggle button: shows 7 columns
- "Connect Google Calendar" prominent button if not connected
- Even without calendar API: show the month grid + current time + "no events" clean empty state

**No backend changes needed.** The calendar tile works as a standalone visual even without Google Calendar API. When we add the API later, we just feed it real event data.

---

## Agent 2: BRIEFING + WSJ

**Branch off:** `ui-jarvis-redesign`  
**Your branch:** `visual-briefing-wsj`

### Briefing — Premium Editorial Tile

**File:** `src/renderer/src/apps/briefing.tsx` (TilePreview + FullApp)  
**New files:**  
- `src/renderer/src/components/briefing/BriefingTilePreview.tsx`
- `src/renderer/src/components/briefing/BriefingEditorial.tsx`

**Tile preview:**
- Dark premium editorial card style
- Top: today's date in large text, formatted like `Tuesday, May 13` (Inter 600 weight, 18px)
- Below: 3 key bullet lines from the latest brief, each with a tiny category icon:
  - Chart icon → portfolio line
  - Mail icon → email line  
  - Calendar icon → schedule line
- Use Lucide icons: `TrendingUp`, `Mail`, `Calendar`
- Bottom: "Generated 7:00am" in text-muted mono
- If no briefing yet: "Briefing generates at 7:00am" with a subtle clock icon
- Subtle dark paper texture: use CSS `background-image` with a noise pattern overlay at 2% opacity

**Full app — editorial layout:**
- NOT a plain markdown dump. Structured, visual sections:
- **PORTFOLIO section:**
  - Reuse a mini version of the allocation donut (small, 80px, just the ring)
  - Top 3 movers: ticker + change with green/red arrow icons
  - Total value in JetBrains Mono
- **EMAILS section:**
  - 3 account pills, each showing unread count
  - Top urgent email: sender + subject
- **MARKET section:**
  - Row of macro chips (S&P, NASDAQ, 10Y, VIX) — each with value + change
  - Use the same styling as `MacroBar.tsx`
- **FOLLOW-UPS section:**
  - Checklist items with status dots (green=done, amber=pending, red=overdue)
- **Section dividers:** thin horizontal line with gradient (blue → transparent → blue)
- "Regenerate" button at bottom: when clicked, shows a spinning refresh icon
- **Scroll:** entire briefing scrolls vertically with smooth momentum

**Data:** Call `window.api.briefing.getLatest('daily')`. Parse the markdown content and render each section as structured components, not raw markdown.

### WSJ — News Ticker Tile

**File:** `src/renderer/src/apps/wsj.tsx` (TilePreview + FullApp)  
**New files:**  
- `src/renderer/src/components/wsj/NewsTicker.tsx`
- `src/renderer/src/components/wsj/StoryCard.tsx`

**Tile preview:**
- **Auto-scrolling headline ticker** (vertical, one headline at a time)
  - Each headline fades in from below, holds for 4 seconds, fades out upward
  - CSS transition: `opacity` + `translateY`, 500ms ease
  - Cycle through the latest 5 headlines
- **"LIVE" indicator:** top-right corner, green dot + "live" text (10px, uppercase, tracking-widest)
  - Pulses if a story arrived in the last 30 minutes
- **Source badge:** tiny pill next to headline ("WSJ" or "Reuters") in text-muted

**Full app — news feed:**
- **Story cards** in a scrolling list:
  - Headline: bold, 14px, text-primary
  - Source: pill badge (glass card, 10px)
  - Time: JetBrains Mono, text-muted, relative ("2h ago")
  - Preview: 2 lines, text-secondary
  - "Brief me" button: small, glass style, with a Volume2 Lucide icon
  - When TTS is playing: replace button with an animated waveform (3 bars bouncing)
- **Breaking news:** story card gets a red left border + subtle red glow
- **Filter bar** at top: "all · markets · tech · economy" — pill toggles
- **Auto-refresh indicator:** subtle spinning icon in top-right, appears during fetch

**Data:** Call `window.api.news.getHeadlines()` for the feed. For TTS, call `window.api.news.briefStory(storyId)` (or show a "TTS not configured" state if it's not wired).

---

## Agent 3: JARVIS + CREW

**Branch off:** `ui-jarvis-redesign`  
**Your branch:** `visual-jarvis-crew`

### Jarvis — Waveform Orb Tile

**File:** `src/renderer/src/apps/jarvis.tsx` (TilePreview + FullApp)  
**New file:** `src/renderer/src/components/jarvis/JarvisWaveform.tsx`

**Tile preview:**
- **Animated waveform** drawn on `<canvas>`:
  - 3 overlapping sine waves in cyan (#22d3ee) at different frequencies
  - Waves oscillate gently when idle (amplitude: 8px, speed: slow)
  - Waves get more active/complex when there's a recent message (amplitude: 20px, add a 4th harmonic)
  - Subtle glow effect: draw the wave twice — once normally, once with blur for the glow
  - Background: transparent (card background shows through)
- **"online" dot:** bottom-left, green (#22c55e), pulsing (opacity 0.6 → 1.0, 2s cycle)
- **Last message:** 1 line of text below the waveform, truncated, text-secondary, 11px
- Canvas resizes with container via `ResizeObserver`

**Full app — chat UI:** `src/renderer/src/components/jarvis/JarvisChat.tsx`
- **Messages list:** scrolling, newest at bottom
  - Jarvis messages: glass card, left-aligned, subtle cyan left-border
  - User messages: glass card with accent-blue/10 background, right-aligned
  - Each message: rendered as markdown (use `react-markdown`)
  - Timestamps: JetBrains Mono, 10px, text-muted, below each message
- **Typing indicator:** 3 dots with sequential bounce animation (like iMessage)
- **Input area:** bottom-fixed, glass background
  - Text input with placeholder "ask jarvis..."
  - Send button (ArrowUp Lucide icon in a cyan circle)
  - Input grows vertically for multiline (max 4 lines)
- **Connection status:** top-right, small dot + "connected" / "connecting..." / "offline"
- **WebSocket:** connects to `ws://127.0.0.1:18789` — the existing code should handle this. If the connection fails, show "offline" state with a "reconnect" button.

### Crew — Team Lineup Tile

**File:** `src/renderer/src/apps/crew.tsx` (TilePreview + FullApp)  
**New files:**
- `src/renderer/src/components/crew/CrewTilePreview.tsx`
- `src/renderer/src/components/crew/AgentAvatar.tsx`

**Tile preview:**
- **5 agent avatars** in a horizontal row, centered
- Each avatar: 36px circle with a Lucide icon inside (white, 18px)
  - Research: `Search`
  - Analyst: `BarChart3`
  - Writer: `PenTool`
  - Planner: `ListChecks`
  - Monitor: `Eye`
- **Status ring** around each avatar circle:
  - Idle (default): thin border #1a2a3a
  - Running: animated rotating cyan dashed border (CSS `border-style: dashed` + rotate animation)
  - Complete: green border, fades after 3s
- **Active tasks badge:** if tasks are running, show count in a small red pill above the row
- **Subtle connecting lines** between adjacent agents (thin, #1a2a3a, 0.3 opacity) — like a team network

**Full app improvements:**
- Agent selection: clicking a card → card expands to 40% width, others shrink to icon-only sidebar
- Task input: glass card, textarea with agent name in placeholder ("What should researcher do?")
- Streaming output: dark code-block style panel with monospace text, auto-scrolls
- Results: each completed task is a collapsible card in a timeline feed
- Timeline: vertical line connecting task cards, newest at top

---

## Git Workflow

1. All 3 agents branch off `ui-jarvis-redesign`
2. Each agent pushes their branch
3. Jarvis reviews + merges
4. All 3 can work in parallel — no file conflicts since each agent owns different components

```
ui-jarvis-redesign (current)
├── visual-inbox-calendar    (Agent 1)
├── visual-briefing-wsj      (Agent 2)  
└── visual-jarvis-crew       (Agent 3)
```

---

## What Success Looks Like

When Coleman opens CMC HQ fullscreen, every single tile on the home grid should have a live, animated, premium graphic. No tile should be a text-only placeholder. The home screen should look like the bridge of a starship — every panel alive with data.

**Quality bar:** `PortfolioTileHud.tsx` (644 lines). That's the standard. Match it.
