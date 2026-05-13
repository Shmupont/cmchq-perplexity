import { Newspaper } from 'lucide-react'
import { useMemo } from 'react'
import { TileHeader } from '@components/home/TileHeader'
import { useNewsFeed } from './useNewsFeed'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

export function WsjTile(): React.JSX.Element {
  const { items, loading } = useNewsFeed(10)
  const latest = items[0]

  const isLive = useMemo(() => {
    if (!latest?.published_at) return false
    return Date.now() - new Date(latest.published_at).getTime() < 30 * 60_000
  }, [latest])

  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Newspaper}
        label="wsj"
        right={
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-negative animate-pulse' : 'bg-text-muted'
              }`}
            />
            <span
              className={`text-[10px] font-mono lowercase ${
                isLive ? 'text-negative' : 'text-text-muted'
              }`}
            >
              {isLive ? 'live' : 'idle'}
            </span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {loading && !latest && (
          <span className="text-[11px] text-text-muted animate-pulse">loading feed…</span>
        )}
        {!loading && !latest && (
          <span className="text-[11px] text-text-muted">no stories yet</span>
        )}
        {latest && (
          <>
            <div className="text-xs text-text-primary leading-snug line-clamp-3">
              {latest.title}
            </div>
            <div className="text-[10px] lowercase text-text-muted">
              {latest.source} · {timeAgo(latest.published_at ?? latest.fetched_at)}
            </div>
          </>
        )}
      </div>
      <div className="text-[10px] lowercase text-text-muted">
        markets · 30s voice brief
      </div>
    </div>
  )
}
