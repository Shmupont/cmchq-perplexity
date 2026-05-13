// Inbox settings — list connected Gmail accounts, add new account via the
// in-app OAuth flow, remove an account, manually trigger sync/re-triage.
// Requires GMAIL_CLIENT_ID/SECRET to be set in .env first.

import { useEffect, useState } from 'react'
import type {
  EmailAccount,
  EmailAccountLabel,
  EmailSyncStatus
} from '../../../../shared/types'

const LABELS: EmailAccountLabel[] = ['personal', 'business', 'school']

export function InboxSettings(): React.JSX.Element {
  const [status, setStatus] = useState<EmailSyncStatus | null>(null)
  const [connecting, setConnecting] = useState<EmailAccountLabel | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    try {
      const s = await window.api.email.status()
      setStatus(s)
    } catch (err) {
      console.error('[InboxSettings] status:', err)
    }
  }

  useEffect(() => {
    load()
    const off = window.api.email.onSyncProgress(load)
    return off
  }, [])

  async function connect(label: EmailAccountLabel): Promise<void> {
    setConnecting(label)
    setError(null)
    try {
      await window.api.email.addAccount({ kind: 'oauth', label })
      await load()
    } catch (err) {
      console.error('[InboxSettings] connect:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setConnecting(null)
    }
  }

  async function remove(account: EmailAccount): Promise<void> {
    if (!confirm(`Disconnect ${account.email}? Local emails for this account will be deleted.`)) return
    try {
      await window.api.email.removeAccount(account.id)
      await load()
    } catch (err) {
      console.error('[InboxSettings] remove:', err)
    }
  }

  async function syncNow(): Promise<void> {
    setSyncing(true)
    try {
      await window.api.email.sync()
      await load()
    } catch (err) {
      console.error('[InboxSettings] sync:', err)
    } finally {
      setSyncing(false)
    }
  }

  async function retriageAll(): Promise<void> {
    try {
      await window.api.email.retriage()
    } catch (err) {
      console.error('[InboxSettings] retriage:', err)
    }
  }

  const accountByLabel = new Map<EmailAccountLabel, EmailAccount>()
  for (const a of status?.accounts ?? []) accountByLabel.set(a.label, a)

  return (
    <section className="card-elevated p-5 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">Inbox</div>
        <div className="text-[11px] text-text-muted">
          Gmail × 3 + Haiku triage
        </div>
      </div>

      {!status?.hasGmailCreds && (
        <div className="mb-3 text-[11px] bg-warning/10 border border-warning/30 text-warning p-2 rounded">
          Set <span className="font-mono">GMAIL_CLIENT_ID</span> and{' '}
          <span className="font-mono">GMAIL_CLIENT_SECRET</span> in{' '}
          <span className="font-mono">.env</span> first — create OAuth credentials at
          console.cloud.google.com (Desktop app type).
        </div>
      )}

      <div className="space-y-2">
        {LABELS.map((label) => {
          const acc = accountByLabel.get(label)
          return (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded border border-border bg-surface"
            >
              <div className="w-24 text-[10px] uppercase tracking-widest text-text-muted">
                {label}
              </div>
              <div className="flex-1 min-w-0">
                {acc ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-text-primary font-mono truncate">
                      {acc.email}
                    </span>
                    <span
                      className={`text-[10px] ${
                        acc.status === 'ok'
                          ? 'text-positive'
                          : acc.status === 'needs_auth'
                            ? 'text-warning'
                            : 'text-text-muted'
                      }`}
                    >
                      {acc.status === 'ok'
                        ? `synced ${acc.last_sync_at ? new Date(acc.last_sync_at).toLocaleString() : ''}`
                        : acc.status.replace('_', ' ')}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-text-muted">not connected</span>
                )}
              </div>
              {acc ? (
                <button
                  onClick={() => remove(acc)}
                  className="text-[11px] text-text-secondary hover:text-negative px-2 py-1"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connect(label)}
                  disabled={!status?.hasGmailCreds || connecting !== null}
                  className="h-7 px-3 rounded-md border border-accent-blue/40 bg-accent-blue/15 text-accent-blue text-[11px] uppercase tracking-wider hover:bg-accent-blue/25 disabled:opacity-40 transition-colors"
                >
                  {connecting === label ? 'Authorizing…' : 'Connect'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && <div className="text-[11px] text-negative mt-3">{error}</div>}

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={syncNow}
          disabled={syncing || !status?.hasGmailCreds || (status?.accounts.length ?? 0) === 0}
          className="h-8 px-3 rounded-md border border-border text-[11px] uppercase tracking-wider hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 transition-colors"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          onClick={retriageAll}
          disabled={!status?.hasAnthropicKey || (status?.accounts.length ?? 0) === 0}
          className="h-8 px-3 rounded-md border border-border text-[11px] uppercase tracking-wider hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 transition-colors"
          title={
            status?.hasAnthropicKey
              ? 'Re-rank every email with Haiku'
              : 'ANTHROPIC_API_KEY not set'
          }
        >
          Re-triage all
        </button>
        {!status?.hasAnthropicKey && (
          <span className="text-[10px] text-text-muted">
            · triage requires ANTHROPIC_API_KEY
          </span>
        )}
      </div>
    </section>
  )
}
