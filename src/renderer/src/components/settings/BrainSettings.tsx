// Brain settings — shows vault path, indexed count, and a Reindex button.
// Reindex triggers OpenAI embeddings for every note in the vault (costs $).

import { useEffect, useState } from 'react'
import type { BrainStatus } from '../../../../shared/brain-types'

export function BrainSettings(): React.JSX.Element {
  const [status, setStatus] = useState<BrainStatus | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.api.brain
        .status()
        .then((s) => !cancelled && setStatus(s))
        .catch((err) => console.error('[BrainSettings] status:', err))
    }
    load()
    const offGraph = window.api.brain.onGraphChanged(load)
    const offIdx = window.api.brain.onIndexProgress((p) => {
      setProgress(p)
      if (p.done >= p.total) {
        setReindexing(false)
        setProgress(null)
        load()
      }
    })
    return () => {
      cancelled = true
      offGraph()
      offIdx()
    }
  }, [])

  async function reindex(): Promise<void> {
    setReindexing(true)
    setProgress(null)
    try {
      await window.api.brain.reindex()
    } catch (err) {
      console.error('[BrainSettings] reindex:', err)
      setReindexing(false)
    }
  }

  return (
    <section className="card-elevated p-5 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">Brain</div>
        <div className="text-[11px] text-text-muted">
          Obsidian vault → knowledge graph + RAG chat
        </div>
      </div>

      {status ? (
        <div className="space-y-3">
          <Row label="Vault path">
            <code className="text-[11px] text-text-secondary font-mono break-all">
              {status.vaultPath}
            </code>
            {!status.vaultExists && (
              <span className="ml-2 text-[11px] text-warning">not found</span>
            )}
          </Row>

          <Row label="Notes">
            <span className="font-mono text-sm text-text-primary">{status.total}</span>
            {status.total > 0 && status.indexed > 0 && (
              <span className="ml-2 text-[11px] text-positive">
                · {status.indexed} indexed
              </span>
            )}
            {status.total > 0 && status.indexed === 0 && status.hasOpenAIKey && (
              <span className="ml-2 text-[11px] text-warning">· not indexed</span>
            )}
            {!status.hasOpenAIKey && (
              <span className="ml-2 text-[11px] text-text-muted">
                · embeddings off (OPENAI_API_KEY)
              </span>
            )}
          </Row>

          <Row label="Last indexed">
            <span className="text-[11px] text-text-secondary">
              {status.lastIndexedAt
                ? new Date(status.lastIndexedAt).toLocaleString()
                : 'never'}
            </span>
          </Row>

          {status.error && (
            <div className="text-[11px] text-negative">{status.error}</div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={reindex}
              disabled={reindexing || !status.hasOpenAIKey}
              className="h-8 px-3 rounded-md border border-accent-blue/40 bg-accent-blue/15 text-accent-blue text-[11px] uppercase tracking-wider hover:bg-accent-blue/25 disabled:opacity-40 transition-colors"
              title={
                status.hasOpenAIKey
                  ? 'Re-embed every note (uses OpenAI credits)'
                  : 'OPENAI_API_KEY not set'
              }
            >
              {reindexing
                ? progress
                  ? `Indexing ${progress.done}/${progress.total}…`
                  : 'Indexing…'
                : 'Reindex now'}
            </button>
            <span className="text-[10px] text-text-muted">
              · Runs ~$0.0002 per note (text-embedding-3-small)
            </span>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-text-muted">Loading…</div>
      )}
    </section>
  )
}

function Row({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-3 text-sm">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <span>{children}</span>
    </div>
  )
}
