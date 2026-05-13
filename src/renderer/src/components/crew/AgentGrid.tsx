import type { AgentSummary, AgentId } from '../../../../shared/agent-types'
import { AgentCard } from './AgentCard'

export function AgentGrid({
  agents,
  selectedId,
  onSelect
}: {
  agents: AgentSummary[]
  selectedId: AgentId | null
  onSelect: (id: AgentId) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-5 gap-3">
      {agents.map((a) => (
        <AgentCard
          key={a.id}
          agent={a}
          selected={a.id === selectedId}
          onClick={() => onSelect(a.id)}
        />
      ))}
    </div>
  )
}
