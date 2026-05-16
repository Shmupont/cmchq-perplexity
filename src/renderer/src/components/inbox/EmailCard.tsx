// Single email card — importance dot, sender, time, subject, snippet.
// Click → onSelect(email) opens detail.

import type { EmailRecord } from '../../../../shared/types'

const URGENT = 0.8
const IMPORTANT = 0.5

function importanceColor(score: number | null): string {
  if (score == null) return 'bg-text-muted'
  if (score >= URGENT) return 'bg-negative shadow-[0_0_8px_rgba(239,68,68,0.7)]'
  if (score >= IMPORTANT) return 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.7)]'
  return 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.65)]'
}

function leftEdgeColor(score: number | null): string {
  if (score == null) return 'rgba(71, 85, 105, 0.4)'
  if (score >= URGENT) return 'rgba(239, 68, 68, 0.85)'
  if (score >= IMPORTANT) return 'rgba(245, 158, 11, 0.85)'
  return 'rgba(59, 130, 246, 0.7)'
}

function relTime(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type Props = {
  email: EmailRecord
  onSelect: (e: EmailRecord) => void
  active?: boolean
}

export function EmailCard({ email, onSelect, active }: Props): React.JSX.Element {
  const sender = email.from_name?.trim() || email.from_address || '(no sender)'
  return (
    <button
      onClick={() => onSelect(email)}
      style={{ borderLeftColor: leftEdgeColor(email.importance_score) }}
      className={`relative w-full text-left rounded-md border border-l-2 px-3 py-2.5 transition-all duration-200 ${
        active
          ? 'bg-surface-elevated/80 border-accent-cyan/50 shadow-[0_0_24px_-12px_rgba(34,211,238,0.6)]'
          : 'bg-surface/60 border-border/80 hover:border-border-active hover:bg-surface-elevated/60'
      }`}
      title={email.importance_reason ?? undefined}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-1.5 inline-block h-2 w-2 rounded-full shrink-0 ${importanceColor(email.importance_score)}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-sm truncate ${
                email.is_unread ? 'text-text-primary font-medium' : 'text-text-secondary'
              }`}
            >
              {sender}
            </span>
            <span className="text-[10px] text-text-muted shrink-0 font-mono">
              {relTime(email.date)}
            </span>
          </div>
          <div className="text-[13px] text-text-primary truncate mt-0.5 leading-snug">
            {email.subject || '(no subject)'}
          </div>
          {email.snippet && (
            <div className="text-[11px] text-text-secondary mt-1.5 leading-snug line-clamp-2">
              {email.snippet}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
