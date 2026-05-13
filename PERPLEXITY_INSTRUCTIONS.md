# Perplexity Computer — UI Rebuild Instructions

## Repo
**https://github.com/Shmupont/cmchq-perplexity**

## What This Is
CMC HQ is a personal command center desktop app (Electron + React + TypeScript + TailwindCSS). It has 8 "mini-apps" on an iOS-style home grid. The backend services, data layer, and IPC are all built and working. **Your job is purely visual — make the UI extraordinary.**

## The Vision: Tony Stark's JARVIS Interface
Think: Iron Man HUD meets Bloomberg Terminal meets Apple design language.

- Dark, cinematic, information-dense
- Glassmorphism on cards and panels (backdrop-blur, subtle transparency, border glow)
- Micro-animations on every interaction (hover lifts, click pulses, page transitions)
- Data is the decoration — numbers, charts, and graphs ARE the visual design
- No emojis anywhere. Clean monochrome Lucide icons only.
- No generic "dashboard" look. This should feel like a $10M custom-built system for one person.

## Color Palette (already in tailwind.config.js — use these)
```
Background:       #04080f   (deep space navy)
Surface:          #0a1018   (card backgrounds)
Surface-elevated: #0f1623   (modals, floating panels)
Border:           #1a2a3a   (default borders)
Border-active:    #2a4060   (focused/hovered)

Accent Blue:      #3b82f6   (primary actions, highlights)
Accent Cyan:      #22d3ee   (data highlights, secondary accent)
Accent Purple:    #a855f7   (tertiary, used on topic nodes)

Positive:         #22c55e   (gains, success, online)
Negative:         #ef4444   (losses, errors, alerts)
Warning:          #f59e0b   (amber, caution)

Text Primary:     #e2e8f0
Text Secondary:   #94a3b8
Text Muted:       #475569
```

## Fonts (already installed)
- **Inter Variable** — all UI text
- **JetBrains Mono Variable** — ALL numbers, prices, counts, code, timestamps

## What to Redesign

### 1. Home Grid (src/renderer/src/components/home/)
The home screen is an iOS-style 3×3 grid of app tiles. Make each tile feel alive:

- **Glass cards** — `backdrop-blur-xl bg-white/[0.03] border border-white/[0.06]` with subtle inner glow
- **Tile hover** — gentle Y-lift (-2px), border brightens to cyan, soft box-shadow glow
- **Tile click** — scale(0.97) then expand to fullscreen (already has transition logic in MiniAppFrame.tsx)
- **Brain tile** (2-col wide) — the @antv/g6 graph is already rendering real data. Add a subtle radial gradient behind it, make the node glow effect more pronounced
- **Portfolio tile** — large total value number, daily P&L with green/red glow effect on the number itself
- **Each tile** should have a frosted glass header bar with the app label (lowercase) and a tiny Lucide icon

### 2. Top Bar (src/renderer/src/components/layout/TopBar.tsx)
- Minimal: "cmchq" text left (lowercase, letter-spaced, text-muted), live clock right
- Thin bottom border with a subtle blue gradient line (1px, fades left to right)
- Settings gear icon far right, opens settings overlay

### 3. Portfolio / Terminal (src/renderer/src/components/terminal/)
Make this look like a Bloomberg terminal designed by Apple:

- **PortfolioOverview** — total value in massive JetBrains Mono (48px+), daily P&L with glow
- **AllocationDonut** — add subtle glow to the active/hovered segment, smooth rotate animation on load
- **HoldingsGrid** — alternating row backgrounds (barely visible), hover highlight, monospace numbers
- **MacroBar** — fixed bottom, frosted glass background, each chip has a subtle pulse animation on data update
- **MiniChart** — TradingView chart with dark theme matching our palette

### 4. Brain (src/renderer/src/components/brain/)
- **KnowledgeGraph** — nodes should have a soft glow halo matching their color. Edges should be very faint (#1a2a3a at 15% opacity). On hover, a node and its connections light up brightly while everything else dims.
- **NoteViewer** — clean markdown rendering on dark background, code blocks with surface-elevated bg
- **BrainChat** — messages have glass card backgrounds, streaming text has a subtle cursor blink

### 5. Crew (src/renderer/src/components/crew/)
- **AgentGrid** — each agent card has an icon, status dot (green=idle, blue=running, gray=offline), glass card
- **TaskRunner** — input field with glass background, streaming output renders as markdown with syntax highlighting
- **ResultsFeed** — timeline-style feed with subtle connecting line between entries

### 6. Briefing (src/renderer/src/components/briefing/)
- Clean editorial layout — like reading a premium newsletter
- Section dividers with thin gradient lines
- Key numbers/tickers highlighted in accent blue or cyan inline

### 7. Inbox (src/renderer/src/components/inbox/)
- **TriageView** — 3 glass columns, email cards with importance dot (red/yellow/blue glow)
- **EmailCard** — subtle left border color matching importance, clean typography hierarchy

### 8. General Polish
- Add subtle page transition animations (fade + slight Y-translate on mount)
- Loading states: skeleton loaders with shimmer animation (not spinners)
- Empty states: clean, minimal, with a subtle icon + one line of text
- Scrollbars: thin, rounded, matching border color, only visible on hover
- All interactive elements: 200ms ease transitions
- Add a very subtle scan-line or noise texture overlay on the background (think CRT monitor feel, barely visible)

## Technical Notes
- This is Electron (electron-vite), not a web app
- TailwindCSS is already configured with the full color palette
- Don't change any backend services, IPC handlers, or data logic — only touch renderer/UI files
- The app uses Zustand for state (src/renderer/src/stores/appStore.ts)
- Mini-apps are registered in src/renderer/src/apps/registry.ts
- Each mini-app has a TilePreview component (shown on grid) and a FullApp component (shown when opened)

## File Structure (renderer only — this is your playground)
```
src/renderer/src/
├── App.tsx                          # Root — don't change routing logic
├── apps/                            # Mini-app registrations
│   ├── registry.ts                  # App registry — add new apps here
│   ├── brain.tsx, portfolio.tsx...   # Each app's tile + full view
├── components/
│   ├── home/                        # Home grid, tiles, transitions
│   │   ├── AppGrid.tsx
│   │   ├── AppTile.tsx
│   │   ├── MiniAppFrame.tsx
│   │   └── TileHeader.tsx
│   ├── brain/                       # Knowledge graph, chat, notes
│   ├── terminal/                    # Portfolio dashboard
│   ├── crew/                        # Agent team UI
│   ├── briefing/                    # Daily/weekly briefs
│   ├── inbox/                       # Email triage
│   └── layout/                      # TopBar, Sidebar, RightDrawer
├── stores/appStore.ts               # Zustand state
├── hooks/                           # Data hooks
└── assets/main.css                  # Global styles + Tailwind
```

## What Success Looks Like
When someone sees this app, their reaction should be: "Holy shit, one person built this?"

It should look like it cost $500K and was designed by a team of 10. It should make Bloomberg Terminal look dated. It should feel like Tony Stark's personal JARVIS interface — alive, responsive, information-rich, and impossibly polished.

Every pixel matters. Every animation matters. Every hover state matters.

Go.
