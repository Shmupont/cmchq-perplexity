import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Briefing } from '../../../../shared/agent-types'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(d)
  } catch {
    return iso
  }
}

export function BriefView({
  brief,
  onRegenerate,
  regenerating
}: {
  brief: Briefing | null
  onRegenerate: () => void
  regenerating: boolean
}): React.JSX.Element {
  if (!brief) {
    return (
      <div className="card p-6 flex flex-col gap-3 items-start">
        <div className="text-sm text-text-secondary">No brief yet.</div>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="h-9 px-4 rounded-md bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-40"
        >
          {regenerating ? 'Generating…' : 'Generate now'}
        </button>
      </div>
    )
  }

  return (
    <div className="card-elevated p-6 flex flex-col gap-3 min-h-0">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          {brief.type === 'daily' ? 'Morning Brief' : 'Weekly Brief'} ·{' '}
          <span className="font-mono normal-case">{formatTime(brief.generated_at)}</span>
        </div>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-[11px] uppercase tracking-wider text-text-secondary hover:text-accent-cyan disabled:opacity-40"
        >
          {regenerating ? 'Regenerating…' : '↻ Regenerate'}
        </button>
      </div>
      <div className="prose prose-invert prose-sm max-w-none overflow-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief.content}</ReactMarkdown>
      </div>
    </div>
  )
}
