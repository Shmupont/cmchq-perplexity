// Jarvis IPC — history persistence + status. The WebSocket itself lives in the
// renderer (apps/jarvis/useJarvisSocket.ts).

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import { listMessages, appendMessage, getStatus } from '../services/jarvis'
import type { JarvisRole } from '../../shared/jarvis-types'

export function registerJarvisIpc(): void {
  ipcMain.handle(IPC.JARVIS_HISTORY, (_e, limit?: number) => listMessages(limit ?? 200))
  ipcMain.handle(IPC.JARVIS_SEND, (_e, input: { role: JarvisRole; content: string }) =>
    appendMessage(input.role, input.content)
  )
  ipcMain.handle(IPC.JARVIS_STATUS, () => getStatus())
}
