// Brain IPC handlers — vault graph, note read, search, RAG chat streaming,
// reindex, stats, status. Streaming events go out over EVT.BRAIN_CHAT_TOKEN.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import {
  getBrainGraph,
  getNote,
  searchNotes,
  brainChat,
  cancelBrainChat,
  getVaultStats,
  getStatus,
  reindexVault
} from '../services/brain'
import type { BrainChatMessage, BrainChatModel } from '../../shared/brain-types'

export function registerBrainIpc(): void {
  ipcMain.handle(IPC.BRAIN_GRAPH, async (_e, force?: boolean) => {
    return getBrainGraph(Boolean(force))
  })

  ipcMain.handle(IPC.BRAIN_NOTE, async (_e, id: string) => {
    return getNote(id)
  })

  ipcMain.handle(IPC.BRAIN_SEARCH, async (_e, query: string, limit?: number) => {
    return searchNotes(query, limit)
  })

  ipcMain.handle(
    IPC.BRAIN_CHAT,
    async (
      _e,
      input: { id: string; messages: BrainChatMessage[]; model: BrainChatModel }
    ) => {
      // Fire-and-forget — results stream via EVT.BRAIN_CHAT_TOKEN
      brainChat(input.id, input.messages, input.model).catch((err) =>
        console.error('[brain] chat error:', err)
      )
      return { started: true }
    }
  )

  ipcMain.handle(IPC.BRAIN_CHAT_CANCEL, (_e, id: string) => {
    cancelBrainChat(id)
    return { cancelled: true }
  })

  ipcMain.handle(IPC.BRAIN_STATS, async () => {
    return getVaultStats()
  })

  ipcMain.handle(IPC.BRAIN_STATUS, async () => {
    return getStatus()
  })

  ipcMain.handle(IPC.BRAIN_REINDEX, async () => {
    reindexVault().catch((err) => console.error('[brain] reindex error:', err))
    return { started: true }
  })
}
