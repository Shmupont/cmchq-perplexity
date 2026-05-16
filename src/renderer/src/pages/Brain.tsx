// The Brain page — interactive knowledge graph on the left (70%), context
// panel on the right (30%): either NoteViewer (when a node is selected) or
// BrainChat. Search bar above the graph filters visible nodes live.

import { useEffect, useState } from 'react'
import { KnowledgeGraph } from '@components/brain/KnowledgeGraph'
import { NoteViewer } from '@components/brain/NoteViewer'
import { BrainChat } from '@components/brain/BrainChat'
import { VaultStats } from '@components/brain/VaultStats'
import type { BrainStatus } from '../../../shared/brain-types'

type PanelTab = 'note' | 'chat' | 'stats'

export function Brain(): React.JSX.Element {
  const [status, setStatus] = useState<BrainStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<PanelTab>('chat')
  const [reindexing, setReindexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.api.brain
        .status()
        .then((s) => !cancelled && setStatus(s))
        .catch((err) => console.error('[Brain] status failed:', err))
    }
    load()
    const offGraph = window.api.brain.onGraphChanged(load)
    const offProgress = window.api.brain.onIndexProgress((p) => {
      setIndexProgress(p)
      if (p.done >= p.total) {
        setReindexing(false)
        setIndexProgress(null)
        load()
      }
    })
    return () => {
      cancelled = true
      offGraph()
      offProgress()
    }
  }, [])

  function openNote(id: string | null): void {
    setSelectedId(id)
    if (id) setTab('note')
  }

  async function reindex(): Promise<void> {
    setReindexing(true)
    setIndexProgress(null)
    try {
      await window.api.brain.reindex()
    } catch (err) {
      console.error('[Brain] reindex failed:', err)
      setReindexing(false)
    }
  }

  return (
    <div className="flex flex-col h-full page-enter">
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface/40 backdrop-blur-xl">
        <div>
          <div className="card-eyebrow-accent">Brain</div>
          <h1 className="text-lg font-medium text-text-primary mt-1 tracking-tight">
            Second memory
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="input h-8 w-64"
          />
          {status && (
            <div className="flex items-center gap-3 text-text-muted">
              <span title={status.vaultPath} className="flex items-center gap-1.5">
                <span className="status-dot is-live" />
                <span className="font-mono text-text-secondary">{status.total}</span>
                <span>notes</span>
              </span>
              <span className="text-border">·</span>
              <span
                className={`flex items-center gap-1.5 ${
                  status.hasOpenAIKey
                    ? status.indexed > 0
                      ? 'text-positive'
                      : 'text-warning'
                    : 'text-text-muted'
                }`}
              >
                <span
                  className={`status-dot ${
                    status.hasOpenAIKey
                      ? status.indexed > 0
                        ? 'is-live'
                        : 'is-warning'
                      : 'is-offline'
                  }`}
                />
                {status.hasOpenAIKey
                  ? status.indexed > 0
                    ? `${status.indexed} indexed`
                    : 'not indexed'
                  : 'embeddings off'}
              </span>
              <button
                onClick={reindex}
                disabled={reindexing || !status.hasOpenAIKey}
                className="btn-ghost"
                title={
                  status.hasOpenAIKey
                    ? 'Re-embed every note (uses OpenAI credits)'
                    : 'OPENAI_API_KEY not set'
                }
              >
                {reindexing
                  ? indexProgress
                    ? `${indexProgress.done}/${indexProgress.total}`
                    : 'indexing…'
                  : 'reindex'}
              </button>
            </div>
          )}
        </div>
      </header>

      {!status?.vaultExists && (
        <div className="px-6 py-2.5 text-xs bg-warning/10 border-b border-warning/30 text-warning flex items-center gap-2">
          <span className="status-dot is-warning" />
          Vault not found at <span className="font-mono">{status?.vaultPath}</span>. Set
          OBSIDIAN_VAULT_PATH in <span className="font-mono">.env</span>.
        </div>
      )}

      {status && !status.hasAnthropicKey && (
        <div className="px-6 py-2.5 text-xs bg-warning/10 border-b border-warning/30 text-warning flex items-center gap-2">
          <span className="status-dot is-warning" />
          ANTHROPIC_API_KEY not set — Brain chat is offline until you add it to{' '}
          <span className="font-mono">.env</span>.
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_420px]">
        <div className="relative border-r border-border/70">
          {/* Soft radial glow behind the graph */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(59,130,246,0.06), transparent 65%)'
            }}
          />
          <KnowledgeGraph
            interactive
            showLabels
            ambient={false}
            highlightQuery={query}
            selectedId={selectedId}
            onSelectNode={openNote}
          />
        </div>
        <aside className="flex flex-col min-h-0 bg-surface/40 backdrop-blur-xl">
          <nav className="flex items-center border-b border-border/70">
            {(['chat', 'note', 'stats'] as PanelTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 px-3 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                  tab === t ? 'text-accent-cyan' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t}
                <span
                  className={`absolute bottom-0 left-3 right-3 h-px transition-all ${
                    tab === t
                      ? 'bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-100'
                      : 'opacity-0'
                  }`}
                />
              </button>
            ))}
          </nav>
          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === 'chat' && <BrainChat onOpenNote={openNote} />}
            {tab === 'note' && <NoteViewer noteId={selectedId} onOpenLink={openNote} />}
            {tab === 'stats' && (
              <div className="overflow-auto h-full">
                <VaultStats onOpenNote={openNote} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
