# CMC HQ — Full Audit

## Critical Bugs (broken right now)

### 1. Settings page doesn't scroll
**File:** `src/renderer/src/pages/Settings.tsx` line 86
**Problem:** Root div is `<div className="p-6 max-w-4xl mx-auto">` with no `overflow-auto` or `h-full`. Content overflows but you can't scroll.
**Fix:** Change to `<div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">`

### 2. Gmail OAuth flow may not trigger
**File:** `src/renderer/src/components/settings/InboxSettings.tsx`
**Problem:** The "Add Account" button calls the IPC but the OAuth callback server binds to a random port. Google Cloud Console needs `http://127.0.0.1` as an authorized redirect URI — but the port changes each time.
**Fix:** Pin the OAuth callback to a fixed port (e.g., 18790) in `src/main/services/email.ts` and add `http://127.0.0.1:18790/oauth/callback` as an authorized redirect URI in Google Cloud Console.

### 3. Reuters RSS fails every refresh
**Log:** `ENOTFOUND www.rss.reuters.com`
**Problem:** Reuters RSS URL is wrong — they changed it.
**Fix:** In the news service, replace `https://www.rss.reuters.com/news/businessNews` with `https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB` (Google News Business) or remove Reuters entirely and add Bloomberg RSS: `https://feeds.bloomberg.com/markets/news.rss`

---

## UX Issues (functional but rough)

### 4. Mini-app close animation is janky
**File:** `src/renderer/src/components/home/MiniAppFrame.tsx`
**Problem:** Close animation tries to shrink back to tile origin rect but the rect coordinates are stale if the window was resized. Looks broken on resize.
**Fix:** On close, fade out + scale down to center instead of animating back to tile origin. Simpler and always works.

### 5. No loading states in tiles
**Problem:** When the app first opens, tiles flash empty before data arrives (portfolio, brain graph, news).
**Fix:** Every tile preview should show a shimmer skeleton while loading. The `shimmer` CSS class exists in main.css — it's just not used anywhere.

### 6. Brain graph — no smooth scroll-to-zoom
**Problem:** Mouse wheel zoom jumps instead of smooth interpolation.
**Fix:** Already addressed in the KnowledgeGraph.tsx rewrite — but verify @antv/g6's `zoom-canvas` behavior has `sensitivity` and `animate` options configured.

### 7. TopBar gear icon opens settings as a tile, not inline
**Problem:** Settings opens as a full MiniApp (taking over the screen) when it should be a slide-in panel or modal. It's too heavy for what it is.
**Fix:** Make settings open in the RightDrawer instead of as a MiniApp. Or at minimum, make it scroll properly (Bug #1).

### 8. No way to get back to home from keyboard
**Problem:** Escape closes the current mini-app, but there's no keyboard shortcut to navigate between tiles without mouse.
**Fix:** Add `Cmd+1` through `Cmd+8` to open tiles directly. `Cmd+0` or `Escape` from home = no-op.

---

## Visual Gaps (looks unfinished)

### 9. Inbox tile — plain text, no graphic
**Status:** Agents V2 addresses this (radar ring). Agent 1 is building it.

### 10. Briefing tile — plain text, no graphic
**Status:** Agents V2 addresses this (editorial layout). Agent 2 is building it.

### 11. WSJ tile — basic placeholder
**Status:** Agents V2 addresses this (news ticker). Agent 2 is building it.

### 12. Jarvis tile — basic placeholder
**Status:** Agents V2 addresses this (waveform orb). Agent 3 is building it.

### 13. Crew tile — basic placeholder
**Status:** Agents V2 addresses this (team lineup). Agent 3 is building it.

### 14. Calendar tile — empty placeholder
**Status:** Agents V2 addresses this (mini month). Agent 1 is building it.

### 15. Home grid tiles have inconsistent heights
**Problem:** Brain tile (2-col) is much taller than portfolio. Other tiles vary.
**Fix:** Enforce `gridAutoRows: '1fr'` so all rows are equal height. Currently set to `minmax(200px, 1fr)` which can cause uneven rows.

### 16. No subtle background animation
**Problem:** The home screen background is flat `#04080f`. Feels dead.
**Fix:** Add a very subtle animated gradient or particle field behind the grid. Low opacity (2-3%), just enough to feel alive. The `BrainConstellation` canvas could run behind everything at 5% opacity as a global ambient.

---

## Data / Backend Gaps

### 17. Portfolio shows $0 when market is closed
**Problem:** yahoo-finance2 quotes return stale or null data outside market hours. The tile shows $0 or NaN.
**Fix:** When `price` is null, fall back to the last cached price from `price_cache` table. Never show $0.

### 18. Brain only loads 211 of 316 notes
**Problem:** iCloud eviction from earlier today left 100+ files undownloaded.
**Fix:** Already addressed — using `~/brain-local` as vault path. But long-term: add error handling in `brain.ts` that silently skips unreadable files instead of logging 100 stack traces.

### 19. WSJ only has one RSS source
**Problem:** Only WSJ RSS works (20 headlines). Reuters is broken (see Bug #3).
**Fix:** Add more sources: Bloomberg, CNBC, Financial Times, MarketWatch.

### 20. Briefing has never generated
**Problem:** The daily brief runs at 7am PT. It's 11pm. No brief exists yet.
**Fix:** Add a "Generate now" button prominently in the briefing tile. Don't make Coleman wait until 7am to see if it works.

---

## Where We've Put THE MOST Attention
1. Portfolio tile (PortfolioTileHud.tsx — 644 lines, fully polished HUD)
2. Brain graph (KnowledgeGraph.tsx — 312 lines, interactive with real data)
3. Home grid layout + tile transitions (AppGrid, AppTile, MiniAppFrame)
4. Backend architecture (all services, IPC, SQLite — solid)
5. Agent system (5 agents, tool use, streaming — built but untested visually)

## Where We've Put THE LEAST Attention
1. **Settings UX** — can't scroll, hard to use, Gmail auth unclear
2. **Empty/loading states** — tiles flash blank, no skeletons
3. **Inbox visual** — plain text, no graphic, Gmail not connected
4. **Briefing visual** — plain text dump, no editorial styling
5. **Calendar** — completely empty placeholder
6. **Jarvis tile** — placeholder, WebSocket not tested
7. **Cross-tile consistency** — portfolio looks like a $500K app, everything else looks like a hackathon

## Priority Order to Make This Special
1. Fix Settings scroll + Gmail OAuth (unblocks real email data)
2. Fix portfolio $0 / NaN when market closed
3. Inbox radar ring (Agent 1 building)
4. Briefing editorial + "Generate now" button (Agent 2 building)
5. Jarvis waveform + working WebSocket (Agent 3 building)
6. WSJ ticker + fix RSS sources (Agent 2 building)
7. Crew team lineup (Agent 3 building)
8. Calendar mini month (Agent 1 building)
9. Global ambient background
10. Keyboard shortcuts + polish pass
