// IPC handlers for the Briefing system.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import {
  getLatestBrief,
  getBriefHistory,
  regenerateBrief,
  type BriefType,
  type Briefing
} from '../services/briefing'

export function registerBriefingIpc(): void {
  ipcMain.handle(IPC.BRIEFING_LATEST, (_e, type: BriefType): Briefing | null =>
    getLatestBrief(type)
  )
  ipcMain.handle(
    IPC.BRIEFING_HISTORY,
    (_e, type: BriefType, limit?: number): Briefing[] => getBriefHistory(type, limit ?? 20)
  )
  ipcMain.handle(IPC.BRIEFING_REGENERATE, (_e, type: BriefType): Promise<Briefing> =>
    regenerateBrief(type)
  )
}
