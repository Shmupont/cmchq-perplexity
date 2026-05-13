// Inbox page — triage view by default, with a "Full inbox" toggle that
// shows all emails across accounts (filterable). Detail panel on the right.
// Renders an auth-needed empty state when no accounts are connected.

import { useCallback, useEffect, useState } from 'react'
import { TriageView } from '@components/inbox/TriageView'
import { EmailCard } from '@components/inbox/EmailCard'
import { EmailDetail } from '@components/inbox/EmailDetail'
import type {
  EmailRecord,
  EmailSyncStatus,
  TriageView as Triage
} from '../../../shared/types'

type Mode = 'triage' | 'all'

export function Inbox(): React.JSX.Element {
  const [status, setStatus] = useState<EmailSyncStatus | null>(null)
  const [triage, setTriage] = useState<Triage>({ columns: [] })
  const [all, setAll] = useState<EmailRecord[]>([])
  const [selected, setSelected] = useState<EmailRecord | null>(null)
  const [mode, setMode] = useState<Mode>('triage')
  const [search, setSearch] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    const [s, t] = await Promise.all([
      window.api.email.status(),
      window.api.email.triage()
    ])
    setStatus(s)
    setTriage(t)
  }, [])

  useEffect(() => {
    refresh().catch((err) => console.error('[Inbox] refresh:', err))
    const off = window.api.email.onSyncProgress(() => refresh())
    return off
  }, [refresh])

  useEffect(() => {
    if (mode !== 'all') return
    let cancelled = false
    window.api.email
      .list({
        search: search.trim() || undefined,
        unread: unreadOnly ? true : undefined,
        limit: 200
      })
      .then((rows) => !cancelled && setAll(rows))
      .catch((err) => !cancelled && console.error('[Inbox] list:', err))
    return () => {
      cancelled = true
    }
  }, [mode, search, unreadOnly])

  async function syncNow(): Promise<void> {
    setSyncing(true)
    try {
      await window.api.email.sync()
    } catch (err) {
      console.error('[Inbox] sync failed:', err)
    } finally {
      setSyncing(false)
      refresh()
    }
  }

  function handleMarkedRead(id: string): void {
    setSelected((prev) => (prev && prev.id === id ? { ...prev, is_unread: false } : prev))
    refresh()
  }

  const noAccounts = status && status.accounts.length === 0

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-muted">Inbox</div>
          <h1 className="text-lg font-medium text-text-primary mt-0.5">
            {mode === 'triage' ? 'Triage · top 3 per account' : 'Full inbox'}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setMode('triage')}
              className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                mode === 'triage'
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Triage
            </button>
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                mode === 'all'
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
          </div>
          {mode === 'all' && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-7 w-48 rounded-md bg-surface border border-border px-2 outline-none focus:border-accent-blue transition-colors"
              />
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={`h-7 px-2 rounded border transition-colors ${
                  unreadOnly
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                Unread
              </button>
            </>
          )}
          <button
            onClick={syncNow}
            disabled={syncing || !status?.hasGmailCreds}
            className="h-7 px-2 rounded border border-border hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 transition-colors"
            title={status?.hasGmailCreds ? '' : 'GMAIL_CLIENT_ID/SECRET not set'}
          >
            {syncing ? 'syncing…' : 'sync'}
          </button>
        </div>
      </header>

      {status && !status.hasGmailCreds && (
        <div className="px-4 py-2 text-xs bg-warning/10 border-b border-warning/30 text-warning">
          GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not set — sync is offline. Add them to{' '}
          <span className="font-mono">.env</span>, then connect an account in Settings.
        </div>
      )}
      {status && !status.hasAnthropicKey && (
        <div className="px-4 py-2 text-xs bg-warning/10 border-b border-warning/30 text-warning">
          ANTHROPIC_API_KEY not set — AI triage is offline. Emails will arrive unranked.
        </div>
      )}

      {noAccounts ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">
            no accounts connected
          </div>
          <p className="text-sm text-text-secondary mt-3 max-w-md">
            Open <span className="text-accent-cyan">Settings</span> to connect your Gmail
            accounts (personal, business, school). Each one needs an OAuth approval — runs
            in your browser.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_440px]">
          <div className="min-h-0 overflow-auto">
            {mode === 'triage' ? (
              <TriageView
                data={triage}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            ) : (
              <div className="p-3 space-y-2">
                {all.length === 0 ? (
                  <div className="text-center text-[11px] text-text-muted py-12">
                    no messages match
                  </div>
                ) : (
                  all.map((e) => (
                    <EmailCard
                      key={e.id}
                      email={e}
                      onSelect={setSelected}
                      active={selected?.id === e.id}
                    />
                  ))
                )}
              </div>
            )}
          </div>
          <aside className="border-l border-border min-h-0 bg-surface/40">
            <EmailDetail email={selected} onMarkedRead={handleMarkedRead} />
          </aside>
        </div>
      )}
    </div>
  )
}
