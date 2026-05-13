import { create } from 'zustand'

export type Page = 'home' | 'brain' | 'terminal' | 'inbox' | 'crew' | 'briefing' | 'settings'

type DrawerContent = { kind: 'chart'; ticker: string } | null

type AppState = {
  page: Page
  drawer: DrawerContent
  setPage: (p: Page) => void
  openDrawer: (c: NonNullable<DrawerContent>) => void
  closeDrawer: () => void
}

export const useAppStore = create<AppState>((set) => ({
  page: 'home',
  drawer: null,
  setPage: (page) => set({ page, drawer: null }),
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null })
}))
