import { create } from 'zustand'

// Legacy page-based routing (still referenced by Sidebar.tsx until cleanup).
export type Page = 'home' | 'brain' | 'terminal' | 'inbox' | 'crew' | 'briefing' | 'settings'

// iOS-style mini-app model — App.tsx renders AppGrid + MiniAppFrame off this.

// Sidebar-driven routing (current model wired in App.tsx + Sidebar.tsx).
export type Page = 'home' | 'brain' | 'terminal' | 'inbox' | 'crew' | 'briefing' | 'settings'

// iOS-style mini-app modal model — scaffolded by Agent 1 in src/renderer/src/apps/*
// but not yet consumed by App.tsx. Kept here so apps/types.ts compiles.
export type AppId =
  | 'brain'
  | 'portfolio'
  | 'inbox'
  | 'jarvis'
  | 'briefing'
  | 'wsj'
  | 'crew'
  | 'calendar'
  | 'settings'

export type TileRect = {
  top: number
  left: number
  width: number
  height: number
}

type DrawerContent = { kind: 'chart'; ticker: string } | null

type AppState = {
// Legacy page-based routing
  page: Page
  setPage: (p: Page) => void

  // Mini-app modal (homescreen branch)

// Page-based routing
  page: Page
  setPage: (p: Page) => void

  // Mini-app modal state (unused by App.tsx today; preserved for Agent 1's HOMESCREEN.md work)
  openApp: AppId | null
  phase: 'idle' | 'opening' | 'closing'
  originRect: TileRect | null
  open: (id: AppId, rect: TileRect) => void
  close: () => void
  finishPhase: () => void

// Right drawer (used by Terminal's mini chart)

// Right drawer
  drawer: DrawerContent
  openDrawer: (c: NonNullable<DrawerContent>) => void
  closeDrawer: () => void
}

export const useAppStore = create<AppState>((set) => ({
  page: 'home',
  setPage: (page) => set({ page }),

  openApp: null,
  phase: 'idle',
  originRect: null,
  open: (id, rect) => set({ openApp: id, originRect: rect, phase: 'opening' }),
  close: () => set({ phase: 'closing' }),
  finishPhase: () =>
    set((s) =>
      s.phase === 'closing'
        ? { openApp: null, originRect: null, phase: 'idle', drawer: null }
        : { phase: 'idle' }
    ),

  drawer: null,
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null })
}))
