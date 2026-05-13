import type { MiniApp } from './types'
import type { AppId } from '@stores/appStore'
import { brainApp } from './brain'
import { portfolioApp } from './portfolio'
import { inboxApp } from './inbox'
import { jarvisApp } from './jarvis'
import { briefingApp } from './briefing'
import { wsjApp } from './wsj'
import { crewApp } from './crew'
import { calendarApp } from './calendar'
import { settingsApp } from './settings'

// Grid order — matches HOMESCREEN.md layout:
//   row 1: brain (col 1-2) | portfolio
//   row 2: inbox  | jarvis | briefing
//   row 3: wsj    | crew   | calendar
export const GRID_APPS: MiniApp[] = [
  brainApp,
  portfolioApp,
  inboxApp,
  jarvisApp,
  briefingApp,
  wsjApp,
  crewApp,
  calendarApp
]

export const ALL_APPS: MiniApp[] = [...GRID_APPS, settingsApp]

const byId: Record<string, MiniApp> = {}
for (const app of ALL_APPS) byId[app.id] = app

export function getApp(id: AppId): MiniApp | undefined {
  return byId[id]
}
