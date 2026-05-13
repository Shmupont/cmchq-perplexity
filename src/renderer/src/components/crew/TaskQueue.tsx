import type { Task, AgentSummary } from '../../../../shared/agent-types'

const STATUS_STYLE: Record<Task['status'], string> = {
  pending: 'text-text-muted',
  running: 'text-accent-cyan',
  completed: 'text-positive',
  failed: 'text-negative'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(d)
  } catch {
    return iso
  }
}

export function TaskQueue({
  tasks,
  agentsById,
  onSelect
}: {
  tasks: Task[]
  agentsById: Record<string, AgentSummary>
  onSelect: (task: Task) => void
}): React.JSX.Element {
  return (
    <div className="card flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-widest text-text-muted">
        Recent Tasks · {tasks.length}
      </div>
      <div className="overflow-auto flex-1">
        {tasks.length === 0 && (
          <div className="p-4 text-xs text-text-muted">No tasks yet — run an agent above.</div>
        )}
        {tasks.map((t) => {
          const agent = agentsById[t.agent_type]
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-surface-elevated transition-colors flex items-start gap-3"
            >
              <span className="text-base mt-0.5" aria-hidden>
                {agent?.icon ?? '·'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-text-secondary">{agent?.name ?? t.agent_type}</span>
                  <span className={`uppercase tracking-wider ${STATUS_STYLE[t.status]}`}>
                    {t.status}
                  </span>
                  <span className="text-text-muted ml-auto font-mono">
                    {formatTime(t.created_at)}
                  </span>
                </div>
                <div className="text-xs text-text-primary mt-0.5 truncate">{t.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
