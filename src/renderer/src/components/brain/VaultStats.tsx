// Compact stats strip rendered above or beside the graph: total count,
// breakdown by type, recently modified, orphan count.

import { useEffect, useState } from 'react'
import type { VaultStats as Stats } from '../../../../shared/brain-types'

const TYPE_COLOR: Record<string, string> = {
  hub: '#3b82f6',
  person: '#22d3ee',
  project: '#22c55e',
  topic: '#a855f7',
  document: '#64748b',
  contact: '#22d3ee',
  note: '#94a3b8'
}

export function VaultStats({
  onOpenNote
}: {
  onOpenNote?: (id: string) => void
}): React.JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.api.brain
        .stats()
        .then((s) => !cancelled && setStats(s))
        .catch((err) => console.error('[VaultStats] load failed:', err))
    }
    load()
    const off = window.api.brain.onGraphChanged(load)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  if (!stats) {
    return <div className="px-4 py-3 text-[11px] text-text-muted">Loading vault stats…</div>
  }

  const total = stats.total
  const entries = Object.entries(stats.byType).filter(([, v]) => v > 0)

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">Vault</div>
        <div className="text-sm font-mono text-text-primary">{total} notes</div>
      </div>

      {entries.length > 0 && (
        <div className="flex gap-1 h-1.5 rounded overflow-hidden bg-border">
          {entries.map(([t, n]) => (
            <div
              key={t}
              title={`${t}: ${n}`}
              style={{
                width: `${(n / total) * 100}%`,
                backgroundColor: TYPE_COLOR[t] ?? TYPE_COLOR.note
              }}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {entries.map(([t, n]) => (
          <div key={t} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: TYPE_COLOR[t] ?? TYPE_COLOR.note }}
              />
              <span className="text-text-secondary lowercase">{t}</span>
            </span>
            <span className="font-mono text-text-muted">{n}</span>
          </div>
        ))}
      </div>

      {stats.recentlyModified.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
            Recently modified
          </div>
          <ul className="space-y-0.5">
            {stats.recentlyModified.slice(0, 5).map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onOpenNote?.(r.id)}
                  className="text-[11px] text-text-secondary hover:text-accent-cyan transition-colors text-left truncate w-full"
                  title={r.id}
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[10px] text-text-muted">
        {stats.orphans.length} orphan{stats.orphans.length === 1 ? '' : 's'}
      </div>
    </div>
  )
}
