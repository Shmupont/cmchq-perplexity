// Brain IPC handlers. Currently exposes the read-only vault graph so the
// homescreen brain tile and Brain mini-app can render the real Obsidian
// knowledge graph. Agent 2 will extend with note content + RAG search.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import { getBrainGraph } from '../services/brain'

export function registerBrainIpc(): void {
  ipcMain.handle(IPC.BRAIN_GRAPH, async (_e, force?: boolean) => {
    return getBrainGraph(Boolean(force))
  })
}
