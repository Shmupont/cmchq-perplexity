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
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-muted">Brain</div>
          <h1 className="text-lg font-medium text-text-primary mt-0.5">Second memory</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-8 w-64 rounded-md bg-surface border border-border px-3 outline-none focus:border-accent-blue transition-colors text-text-primary"
          />
          {status && (
            <div className="flex items-center gap-2 text-text-muted">
              <span title={status.vaultPath}>{status.total} notes</span>
              <span>·</span>
              <span
                className={
                  status.hasOpenAIKey
                    ? status.indexed > 0
                      ? 'text-positive'
                      : 'text-warning'
                    : 'text-text-muted'
                }
              >
                {status.hasOpenAIKey
                  ? status.indexed > 0
                    ? `${status.indexed} indexed`
                    : 'not indexed'
                  : 'embeddings off'}
              </span>
              <button
                onClick={reindex}
                disabled={reindexing || !status.hasOpenAIKey}
                className="h-7 px-2 rounded border border-border hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 transition-colors"
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
        <div className="px-4 py-2 text-xs bg-warning/10 border-b border-warning/30 text-warning">
          Vault not found at <span className="font-mono">{status?.vaultPath}</span>. Set
          OBSIDIAN_VAULT_PATH in <span className="font-mono">.env</span>.
        </div>
      )}

      {status && !status.hasAnthropicKey && (
        <div className="px-4 py-2 text-xs bg-warning/10 border-b border-warning/30 text-warning">
          ANTHROPIC_API_KEY not set — Brain chat is offline until you add it to{' '}
          <span className="font-mono">.env</span>.
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px]">
        <div className="relative border-r border-border">
          <KnowledgeGraph
            interactive
            showLabels
            ambient={false}
            highlightQuery={query}
            selectedId={selectedId}
            onSelectNode={openNote}
          />
        </div>
        <aside className="flex flex-col min-h-0 bg-surface/40">
          <nav className="flex items-center border-b border-border">
            {(['chat', 'note', 'stats'] as PanelTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2.5 text-[11px] uppercase tracking-widest transition-colors ${
                  tab === t
                    ? 'text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
                }`}
              >
                {t}
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
