// IPC handlers for the API-key store (Anthropic + OpenAI), encrypted via safeStorage.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import { getKeyStatus, setKey, clearKey, type KeyName } from '../services/keys'

export function registerKeysIpc(): void {
  ipcMain.handle(IPC.KEYS_STATUS, (): Record<KeyName, boolean> => getKeyStatus())

  ipcMain.handle(IPC.KEYS_SET, (_e, name: KeyName, value: string): Record<KeyName, boolean> => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Key value must be a non-empty string')
    }
    setKey(name, value.trim())
    return getKeyStatus()
  })

  ipcMain.handle(IPC.KEYS_CLEAR, (_e, name: KeyName): Record<KeyName, boolean> => {
    clearKey(name)
    return getKeyStatus()
  })
}
