import type { AgentSummary } from '../../../../shared/agent-types'

export function AgentCard({
  agent,
  selected,
  onClick
}: {
  agent: AgentSummary
  selected: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`card p-3 text-left flex flex-col gap-1.5 transition-all ${
        selected ? 'glow-active border-border-active' : 'hover:border-border-active'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {agent.icon}
        </span>
        <span className="text-sm font-medium text-text-primary">{agent.name}</span>
      </div>
      <div className="text-[11px] text-text-secondary leading-snug">{agent.description}</div>
      <div className="mt-auto flex items-center gap-1.5 pt-1">
        <span className="text-[9px] uppercase tracking-wider text-text-muted">model</span>
        <span className="text-[10px] font-mono text-text-secondary">
          {agent.model.replace('claude-', '').replace('-20251001', '')}
        </span>
      </div>
    </button>
  )
}
