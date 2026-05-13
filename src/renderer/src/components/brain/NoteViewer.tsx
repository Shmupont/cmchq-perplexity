// Renders a selected note as markdown. Shown in the Brain page's right panel
// when a graph node is selected. Read-only — Obsidian owns the file.

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NoteDetail } from '../../../../shared/brain-types'

type Props = {
  noteId: string | null
  onOpenLink?: (id: string) => void
}

export function NoteViewer({ noteId, onOpenLink }: Props): React.JSX.Element {
  const [note, setNote] = useState<NoteDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!noteId) {
      setNote(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    window.api.brain
      .getNote(noteId)
      .then((n) => {
        if (cancelled) return
        if (!n) setError('Note not found')
        setNote(n)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [noteId])

  if (!noteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          No note selected
        </div>
        <div className="text-sm text-text-secondary mt-2">
          Click a node in the graph, or search above.
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-5 text-xs text-text-muted animate-pulse">Loading note…</div>
  }

  if (error || !note) {
    return <div className="p-5 text-sm text-negative">{error ?? 'Note unavailable'}</div>
  }

  const modified = new Date(note.modifiedAt)
  return (
    <div className="flex flex-col h-full">
      <header className="px-5 pt-5 pb-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">{note.type}</div>
        <h2 className="text-lg font-medium text-text-primary mt-1">{note.title}</h2>
        <div className="text-[11px] text-text-muted mt-1 font-mono">
          {note.id} · modified {modified.toLocaleDateString()}{' '}
          {modified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {note.area && <div className="text-[11px] text-accent-cyan mt-1">area: {note.area}</div>}
      </header>
      <div className="flex-1 overflow-auto px-5 py-4 prose-brain text-sm text-text-primary leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...rest }) => {
              const isExternal = href?.startsWith('http')
              return (
                <a
                  {...rest}
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="text-accent-cyan hover:text-accent-blue underline-offset-2 hover:underline"
                >
                  {children}
                </a>
              )
            },
            h1: ({ children }) => (
              <h1 className="text-xl font-semibold text-text-primary mt-4 mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-medium text-text-primary mt-4 mb-2 border-b border-border pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-medium text-text-primary mt-3 mb-1">{children}</h3>
            ),
            code: ({ children, className }) => (
              <code
                className={`font-mono text-[12px] bg-surface-elevated px-1.5 py-0.5 rounded border border-border ${
                  className ?? ''
                }`}
              >
                {children}
              </code>
            ),
            ul: ({ children }) => <ul className="list-disc ml-6 my-2 space-y-0.5">{children}</ul>,
            ol: ({ children }) => (
              <ol className="list-decimal ml-6 my-2 space-y-0.5">{children}</ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-accent-cyan/40 pl-3 my-2 text-text-secondary">
                {children}
              </blockquote>
            ),
            p: ({ children }) => <p className="my-2">{children}</p>,
            hr: () => <hr className="my-4 border-border" />
          }}
        >
          {renderObsidianLinks(note.content)}
        </ReactMarkdown>
      </div>
      {note.linksOut.length > 0 && (
        <footer className="border-t border-border px-5 py-3">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
            Links out · {note.linksOut.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {note.linksOut.slice(0, 24).map((id) => (
              <button
                key={id}
                onClick={() => onOpenLink?.(id)}
                className="text-[11px] px-2 py-0.5 rounded border border-border bg-surface hover:border-accent-cyan hover:text-accent-cyan transition-colors"
                title={id}
              >
                {id.split('/').pop()}
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  )
}

// Turn [[Wiki Links]] into markdown-flavored links so react-markdown picks them up.
// Form: [[Note Title]] or [[Note Title|alias]] → [alias or Note Title](obsidian://Note%20Title)
function renderObsidianLinks(src: string): string {
  return src.replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?(?:#[^\]]*)?\]\]/g, (_m, target, alias) => {
    const label = (alias ?? target).trim()
    const safe = encodeURIComponent(String(target).trim())
    return `[${label}](obsidian://${safe})`
  })
}
