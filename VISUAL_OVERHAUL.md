# Visual Overhaul — Every Tile Gets Premium Graphics

## The Problem
Only the Portfolio tile has real visual polish (allocation wheel, HUD). Every other tile looks like a basic placeholder. Coleman wants EVERY window to have the same level of graphics and interactivity as the portfolio tile.

## The Rule
No tile should just show text. Every tile preview must have an interactive, animated visual as its primary element. Text is secondary — the graphic IS the content.

---

## Tile 1: brain (already has graph — KEEP, just polish)
- Graph is working. Add more glow, smoother animations.
- Node hover: radial pulse outward from the hovered node
- Ambient mode on home tile: slow auto-rotation, gentle breathing glow

## Tile 2: portfolio (already has HUD — KEEP)
- Working. The JARVIS allocation wheel is great.
- Total must include cash balance ($26K ML Bank Deposit)

## Tile 3: inbox — NEEDS COMPLETE VISUAL REDESIGN
**Tile preview:**
- **Email radar ring** — concentric rings like a radar/sonar display
- Inner ring: urgent emails (red dots, pulsing)
- Middle ring: important emails (amber dots)  
- Outer ring: normal emails (blue dots, static)
- Each dot = one unread email, positioned on the ring
- 3 arc segments on the ring = 3 accounts (Personal / Business / School), each a different subtle color zone
- Center of radar: total unread count in large JetBrains Mono
- Radar sweep animation: a faint cyan line rotates around the rings (like actual radar)

**Full app (when opened):**
- Keep the 3-column triage layout but add:
  - Account header bars with unread count badges
  - Email importance as a glowing left-border (red/amber/blue)
  - Category breakdown donut per account (inbox/important/spam/updates) — small, in the column header
  - AI triage summary at top: "3 urgent, 7 important, 12 routine"

## Tile 4: jarvis — NEEDS VISUAL REDESIGN  
**Tile preview:**
- Audio waveform visualization (like Siri's orb but minimal)
- Animated sine wave in cyan that pulses gently when idle
- Wave gets more active/complex when there's a recent message
- "online" status dot, green, pulsing
- Last message snippet below the waveform (1 line, truncated)

**Full app:**
- Chat UI with glass card message bubbles
- Jarvis messages: dark glass card, left-aligned
- User messages: accent blue glass card, right-aligned
- Typing indicator: 3 dots with wave animation
- Message timestamps in JetBrains Mono, text-muted

## Tile 5: briefing — NEEDS VISUAL REDESIGN
**Tile preview:**
- Newspaper/editorial style header: today's date in large serif-style text
- 3 key bullet points from the brief, each with a category icon (portfolio, email, calendar)
- Subtle paper texture background (dark version — like a premium dark-mode newsletter)
- "Generated 7:00am" timestamp at bottom

**Full app (when opened):**
- **Premium editorial layout** — NOT a plain text dump
- Structured sections with visual dividers:
  - **PORTFOLIO** section: mini allocation wheel (reuse from portfolio tile) + key movers with green/red arrows
  - **EMAILS** section: 3 mini radar dots per account showing what needs response
  - **SCHEDULE** section: timeline bar showing today's events
  - **FOLLOW-UPS** section: checklist with status dots
  - **MARKET** section: macro chips (S&P, NASDAQ, 10Y, VIX) with spark-line trends
- Each section has a thin gradient divider line (blue to transparent)
- Key numbers highlighted in accent cyan inline
- "Regenerate" button at bottom with refresh animation

## Tile 6: wsj — NEEDS VISUAL REDESIGN
**Tile preview:**
- Scrolling ticker of headlines (like a news chyron on CNN/Bloomberg)
- Headlines auto-scroll vertically, one at a time, with fade transition
- "LIVE" indicator: green dot + "live" text, pulses when new story in last 30 min
- Source badges (WSJ, Reuters) as tiny pill tags

**Full app:**
- News feed with card layout, not just a list
- Each story card: headline (bold), source pill, time (mono), 2-line preview
- "Brief me" button on each card with a waveform icon
- When TTS is playing: waveform animation on the active card
- Category filter bar at top (Markets, Tech, Economy, All)
- Breaking news: card has a red left border + subtle pulse

## Tile 7: crew — NEEDS VISUAL REDESIGN
**Tile preview:**
- 5 agent icons in a horizontal row (like a team lineup)
- Each icon: circle with the agent's Lucide icon inside
- Status ring around each: green (idle), blue (running), gray (offline)
- Active task count badge
- Subtle connecting lines between agents (like a network/team graph)

**Full app:**
- Agent selection: click an agent card → it expands, others shrink
- Task input: glass-morphism text area with "What should [agent] do?" placeholder
- Streaming output: code-block style with syntax highlighting for markdown
- Task history: timeline feed with connecting vertical line

## Tile 8: calendar — NEEDS VISUAL REDESIGN
**Tile preview (even without Google Calendar connected):**
- Mini month grid (current month, today highlighted with cyan dot)
- Next 2-3 events listed below (or "no events today" with a clean empty state)
- Current time indicator: thin horizontal line with the time in mono

**Full app:**
- Day view by default: vertical timeline with hour markers
- Events as glass cards positioned on the timeline
- Week toggle: 7 columns with events as colored blocks
- "Connect Google Calendar" button if not yet authorized

---

## Technical Notes
- Only modify `src/renderer/` files
- Use canvas or SVG for custom graphics (radar ring, waveform, etc.)
- Reuse the HUD pattern from `PortfolioTileHud.tsx` as a reference for quality
- All animations: requestAnimationFrame for canvas, CSS transitions for DOM
- JetBrains Mono for ALL numbers and timestamps
- Keep the glassmorphism consistent: `backdrop-blur-xl bg-white/[0.03] border border-white/[0.06]`
- Tile previews must be performant — they all render simultaneously on the home grid

---

## Priority Order
1. Inbox (radar ring) — most impactful, Coleman specifically asked for it
2. Briefing (editorial layout) — Coleman specifically asked for styled briefing
3. WSJ (news ticker) — visual + functional upgrade
4. Jarvis (waveform) — visual personality
5. Crew (team lineup) — visual upgrade
6. Calendar (mini month) — even without API, looks polished
