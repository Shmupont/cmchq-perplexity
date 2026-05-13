// IPC handlers for the WSJ news mini-app. Brief flow: summarize → speak.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import { listFeed, refreshFeeds, summarize, speakSummary } from '../services/news'

export function registerNewsIpc(): void {
  ipcMain.handle(IPC.NEWS_LIST, (_e, limit?: number) => listFeed(limit ?? 40))
  ipcMain.handle(IPC.NEWS_REFRESH, () => refreshFeeds())
  ipcMain.handle(IPC.NEWS_BRIEF, async (_e, id: string) => {
    const summary = await summarize(id)
    const playback = await speakSummary(summary)
    return { summary, played: playback.played, reason: playback.reason ?? null }
  })
}
