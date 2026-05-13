import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { Inbox as InboxPage } from '@pages/Inbox'
import type { TriageView, EmailSyncStatus } from '../../../shared/types'

function TilePreview(): React.JSX.Element {
  const [triage, setTriage] = useState<TriageView>({ columns: [] })
  const [status, setStatus] = useState<EmailSyncStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        const [t, s] = await Promise.all([window.api.email.triage(), window.api.email.status()])
        if (!cancelled) {
          setTriage(t)
          setStatus(s)
        }
      } catch (err) {
        console.error('[inbox-tile] load:', err)
      }
    }
    load()
    const off = window.api.email.onSyncProgress(load)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  const topEmails = triage.columns
    .map((c) => ({ label: c.account.label, email: c.emails[0] }))
    .filter((x) => x.email)

  const totalUnread = triage.columns.reduce((n, c) => n + c.emails.length, 0)

  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Mail}
        label="inbox"
        right={
          totalUnread > 0 ? (
            <span className="text-[10px] font-mono text-accent-cyan">{totalUnread}</span>
          ) : null
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {topEmails.length === 0 ? (
          <div className="text-[11px] text-text-muted text-center">
            {status && status.accounts.length === 0 ? 'no accounts' : 'inbox zero'}
          </div>
        ) : (
          topEmails.map(({ label, email }) => (
            <div key={label} className="text-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-text-primary truncate">
                  {email.from_name || email.from_address || 'unknown'}
                </span>
                <span className="text-[9px] lowercase text-text-muted ml-2 shrink-0">{label}</span>
              </div>
              <div className="text-text-secondary text-[11px] truncate">
                {email.subject || '(no subject)'}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="text-[10px] lowercase text-text-muted">
        gmail × {status ? status.accounts.length : 3}
      </div>
    </div>
  )
}

export const inboxApp: MiniApp = {
  id: 'inbox',
  label: 'inbox',
  Icon: Mail,
  TilePreview,
  FullApp: InboxPage,
  badge: () => null
}
