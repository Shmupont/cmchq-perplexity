import type { Briefing } from '../../../../shared/agent-types'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(d)
  } catch {
    return iso
  }
}

export function BriefArchive({
  briefings,
  selectedId,
  onSelect
}: {
  briefings: Briefing[]
  selectedId: number | null
  onSelect: (b: Briefing) => void
}): React.JSX.Element {
  return (
    <div className="card flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-widest text-text-muted">
        Archive · {briefings.length}
      </div>
      <div className="overflow-auto flex-1">
        {briefings.length === 0 && (
          <div className="p-4 text-xs text-text-muted">No briefings yet.</div>
        )}
        {briefings.map((b) => {
          const active = b.id === selectedId
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                active ? 'bg-surface-elevated' : 'hover:bg-surface-elevated'
              }`}
            >
              <div className="text-[11px] font-mono text-text-secondary">
                {formatTime(b.generated_at)}
              </div>
              <div className="text-xs text-text-muted mt-0.5 truncate">
                {b.content.split('\n').find((l) => l.trim().length > 0) ?? '—'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
