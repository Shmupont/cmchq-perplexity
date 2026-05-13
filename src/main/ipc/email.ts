// Email IPC handlers — triage view, full list, detail (fetches full body
// from Gmail on demand), mark read, account add/remove via OAuth flow.

import { ipcMain } from 'electron'
import { IPC } from '../constants'
import {
  getTriageView,
  getAllEmails,
  getEmailDetail,
  markRead,
  listAccounts,
  addAccount,
  removeAccount,
  syncAndTriageAll,
  retriageAll,
  getEmailStatus,
  runOAuthFlow
} from '../services/email'
import type { EmailAccountLabel, EmailFilters } from '../../shared/types'

export function registerEmailIpc(): void {
  ipcMain.handle(IPC.EMAIL_TRIAGE, () => getTriageView())

  ipcMain.handle(IPC.EMAIL_LIST, (_e, filters: EmailFilters) => getAllEmails(filters ?? {}))

  ipcMain.handle(IPC.EMAIL_DETAIL, async (_e, id: string, accountId: number) =>
    getEmailDetail(id, accountId)
  )

  ipcMain.handle(IPC.EMAIL_MARK_READ, async (_e, id: string, accountId: number) => {
    await markRead(id, accountId)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.EMAIL_ACCOUNTS, () => listAccounts())

  // input is either { kind: 'oauth', label } to run the OAuth flow, or
  // { kind: 'token', email, label, refresh_token } to add a pre-obtained token.
  ipcMain.handle(
    IPC.EMAIL_ACCOUNT_ADD,
    async (
      _e,
      input:
        | { kind: 'oauth'; label: EmailAccountLabel }
        | { kind: 'token'; email: string; label: EmailAccountLabel; refresh_token: string }
    ) => {
      if (input.kind === 'token') {
        return addAccount({
          email: input.email,
          label: input.label,
          refresh_token: input.refresh_token
        })
      }
      const { email, refresh_token } = await runOAuthFlow()
      return addAccount({ email, label: input.label, refresh_token })
    }
  )

  ipcMain.handle(IPC.EMAIL_ACCOUNT_REMOVE, (_e, id: number) => removeAccount(id))

  ipcMain.handle(IPC.EMAIL_SYNC, () => syncAndTriageAll())
  ipcMain.handle(IPC.EMAIL_STATUS, () => getEmailStatus())

  ipcMain.handle(IPC.EMAIL_RETRIAGE, () => {
    retriageAll().catch((err) => console.error('[email] retriage error:', err))
    return { started: true as const }
  })
}
