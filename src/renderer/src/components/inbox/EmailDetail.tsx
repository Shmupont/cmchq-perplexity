// Email detail panel — fetches full body from Gmail on demand. Renders HTML
// inside an iframe-style sandbox (basic — strips scripts) or falls back to
// plain text. "Mark as read" button updates Gmail + local DB.

import { useEffect, useState } from 'react'
import type { EmailDetail as Detail, EmailRecord } from '../../../../shared/types'

type Props = {
  email: EmailRecord | null
  onMarkedRead?: (id: string) => void
}

function sanitizeHtml(html: string): string {
  // Minimal sanitizer: strip scripts/iframes/event handlers. The renderer
  // uses srcdoc + sandbox so even pathological HTML can't reach Electron APIs,
  // but we still cut obvious risks before rendering.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export function EmailDetail({ email, onMarkedRead }: Props): React.JSX.Element {
  const [body, setBody] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBody(null)
    setError(null)
    if (!email) return
    let cancelled = false
    setLoading(true)
    window.api.email
      .detail(email.id, email.account_id)
      .then((d) => !cancelled && setBody(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [email])

  async function markRead(): Promise<void> {
    if (!email) return
    try {
      await window.api.email.markRead(email.id, email.account_id)
      onMarkedRead?.(email.id)
    } catch (err) {
      console.error('[EmailDetail] markRead:', err)
    }
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          No email selected
        </div>
        <div className="text-sm text-text-secondary mt-2">
          Pick a card to read the full message.
        </div>
      </div>
    )
  }

  const sender = email.from_name?.trim() || email.from_address || '(no sender)'
  const isHtml = Boolean(body?.body_html)
  const safeHtml = body?.body_html ? sanitizeHtml(body.body_html) : ''

  return (
    <div className="flex flex-col h-full">
      <header className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] uppercase tracking-widest text-accent-cyan">
            {email.account_label}
          </span>
          <span className="text-[10px] text-text-muted font-mono">
            {email.date ? new Date(email.date).toLocaleString() : ''}
          </span>
        </div>
        <h2 className="text-lg font-medium text-text-primary mt-1.5">
          {email.subject || '(no subject)'}
        </h2>
        <div className="text-xs text-text-secondary mt-1">
          From <span className="text-text-primary">{sender}</span>{' '}
          {email.from_address && email.from_name && (
            <span className="text-text-muted font-mono">&lt;{email.from_address}&gt;</span>
          )}
        </div>
        {email.importance_reason && (
          <div className="text-[11px] text-text-muted mt-2 italic">
            triage: {email.importance_reason}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          {email.is_unread && (
            <button
              onClick={markRead}
              className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border border-border hover:border-accent-cyan hover:text-accent-cyan transition-colors"
            >
              Mark as read
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {loading && <div className="p-5 text-xs text-text-muted animate-pulse">Loading…</div>}
        {error && <div className="p-5 text-sm text-negative">{error}</div>}
        {!loading && !error && isHtml && (
          <iframe
            title="email body"
            sandbox=""
            srcDoc={`<base target="_blank"><style>body{font-family:Inter,system-ui;color:#e2e8f0;background:#0a1018;padding:16px;font-size:13px;line-height:1.6;}a{color:#22d3ee}img{max-width:100%;height:auto}blockquote{border-left:2px solid #1a2a3a;padding-left:12px;color:#94a3b8}</style>${safeHtml}`}
            className="w-full h-full border-0"
          />
        )}
        {!loading && !error && !isHtml && body?.body_text && (
          <pre className="p-5 text-[12px] text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
            {body.body_text}
          </pre>
        )}
        {!loading && !error && !body?.body_html && !body?.body_text && (
          <div className="p-5 text-sm text-text-muted">{email.snippet ?? 'No body available.'}</div>
        )}
      </div>
    </div>
  )
}
