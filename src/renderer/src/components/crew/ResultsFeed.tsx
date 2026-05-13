import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Task, AgentSummary } from '../../../../shared/agent-types'

export function ResultsFeed({
  task,
  agent,
  onClose
}: {
  task: Task
  agent: AgentSummary | undefined
  onClose: () => void
}): React.JSX.Element {
  return (
    <div className="card-elevated flex flex-col gap-3 p-4 min-h-0">
      <div className="flex items-start gap-2">
        <span className="text-lg" aria-hidden>
          {agent?.icon ?? '·'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">
            {agent?.name ?? task.agent_type}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">{task.description}</div>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] text-text-muted hover:text-text-primary"
        >
          ✕
        </button>
      </div>
      <div className="card-flat p-4 overflow-auto max-h-[400px] text-sm leading-relaxed">
        {task.output ? (
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.output}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-text-muted">No output recorded.</div>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-text-muted">
        <span>
          tokens: <span className="font-mono normal-case">{task.tokens_used ?? '—'}</span>
        </span>
        <span>
          model: <span className="font-mono normal-case">{task.model}</span>
        </span>
        <span>
          status: <span className="normal-case">{task.status}</span>
        </span>
      </div>
    </div>
  )
}
