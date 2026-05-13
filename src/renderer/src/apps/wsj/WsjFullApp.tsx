import { useState } from 'react'
import { Newspaper, RefreshCw, Volume2, Loader2, ExternalLink } from 'lucide-react'
import { useNewsFeed } from './useNewsFeed'
import type { NewsItem } from '../../../../shared/news-types'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.round(h / 24)} day(s) ago`
}

type BriefState =
  | { kind: 'idle' }
  | { kind: 'briefing'; id: string }
  | { kind: 'ready'; id: string; summary: string; played: boolean; reason: string | null }
  | { kind: 'error'; id: string; message: string }

export function WsjFullApp(): React.JSX.Element {
  const { items, loading, error, refresh } = useNewsFeed(80)
  const [filter, setFilter] = useState<'all' | 'wsj' | 'reuters'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [brief, setBrief] = useState<BriefState>({ kind: 'idle' })

  async function handleRefresh(): Promise<void> {
    setRefreshing(true)
    try {
      await window.api.news.refresh()
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleBrief(item: NewsItem): Promise<void> {
    setBrief({ kind: 'briefing', id: item.id })
    try {
      const res = await window.api.news.brief(item.id)
      setBrief({ kind: 'ready', id: item.id, summary: res.summary, played: res.played, reason: res.reason })
    } catch (err) {
      setBrief({
        kind: 'error',
        id: item.id,
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  function openExternal(url: string): void {
    // Electron sets up a window.open handler in main that defers to shell.openExternal
    window.open(url, '_blank')
  }

  const visible = filter === 'all' ? items : items.filter((i) => i.source === filter)

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Newspaper size={16} className="text-text-secondary" strokeWidth={1.5} />
          <h1 className="text-base font-medium text-text-primary lowercase">wsj</h1>
          <span className="text-[11px] lowercase text-text-muted">
            financial news · 30-second voice briefings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 card-flat p-1">
            {(['all', 'wsj', 'reuters'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 text-[11px] lowercase rounded transition-colors ${
                  filter === s
                    ? 'bg-surface-elevated text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 px-2.5 rounded-md bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-active transition-colors flex items-center gap-1.5 text-[11px] disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'refreshing' : 'refresh'}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        {error && <div className="p-6 text-sm text-negative">Failed to load: {error}</div>}
        {loading && items.length === 0 && (
          <div className="p-6 text-sm text-text-muted animate-pulse">loading feed…</div>
        )}
        {!loading && visible.length === 0 && (
          <div className="p-6 text-sm text-text-muted">
            No stories yet. Click refresh — feeds may be slow to populate.
          </div>
        )}
        <ul className="divide-y divide-border">
          {visible.map((item) => {
            const isThis =
              (brief.kind === 'briefing' || brief.kind === 'ready' || brief.kind === 'error') &&
              brief.id === item.id
            return (
              <li
                key={item.id}
                className="px-6 py-4 hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-mono lowercase text-accent-cyan">
                        {item.source}
                      </span>
                      <span className="text-[10px] lowercase text-text-muted">
                        {timeAgo(item.published_at ?? item.fetched_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => openExternal(item.link)}
                      className="text-left text-sm text-text-primary hover:text-accent-cyan transition-colors flex items-start gap-1.5 group"
                    >
                      <span>{item.title}</span>
                      <ExternalLink
                        size={11}
                        className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      />
                    </button>
                    {item.description && (
                      <div className="text-xs text-text-secondary mt-1 line-clamp-2 leading-snug">
                        {item.description}
                      </div>
                    )}
                    {isThis && brief.kind === 'ready' && (
                      <div className="mt-3 rounded border border-border bg-surface-elevated p-3 text-xs text-text-secondary leading-relaxed">
                        <div className="text-[10px] lowercase text-text-muted mb-1.5">
                          jarvis brief {brief.played ? '· playing' : `· ${brief.reason ?? 'not played'}`}
                        </div>
                        {brief.summary}
                      </div>
                    )}
                    {isThis && brief.kind === 'error' && (
                      <div className="mt-3 text-xs text-negative">Brief failed: {brief.message}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleBrief(item)}
                    disabled={isThis && brief.kind === 'briefing'}
                    className="shrink-0 h-8 px-3 rounded-md bg-accent-blue/15 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/25 transition-colors flex items-center gap-1.5 text-[11px] lowercase disabled:opacity-50"
                  >
                    {isThis && brief.kind === 'briefing' ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> briefing
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} /> brief me
                      </>
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
