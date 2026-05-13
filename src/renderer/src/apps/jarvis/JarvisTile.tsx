import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TileHeader } from '@components/home/TileHeader'
import type { JarvisMessage } from '../../../../shared/jarvis-types'
import { useJarvisStatus } from './useJarvisStatus'

export function JarvisTile(): React.JSX.Element {
  const online = useJarvisStatus()
  const [lastMsg, setLastMsg] = useState<JarvisMessage | null>(null)
  const [secondLast, setSecondLast] = useState<JarvisMessage | null>(null)

  useEffect(() => {
    let cancelled = false
    function load(): void {
      window.api.jarvis
        .history(2)
        .then((msgs) => {
          if (cancelled) return
          setLastMsg(msgs.at(-1) ?? null)
          setSecondLast(msgs.length > 1 ? msgs.at(-2) ?? null : null)
        })
        .catch((err) => console.error('[jarvis-tile] history:', err))
    }
    load()
    const id = setInterval(load, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Sparkles}
        label="jarvis"
        right={
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                online
                  ? 'bg-positive shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse'
                  : 'bg-text-muted'
              }`}
            />
            <span
              className={`text-[10px] lowercase ${online ? 'text-text-secondary' : 'text-text-muted'}`}
            >
              {online ? 'online' : 'offline'}
            </span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-2 text-xs">
        {!lastMsg && !secondLast && (
          <div className="text-text-muted lowercase">no exchanges yet</div>
        )}
        {secondLast && (
          <div className="text-text-secondary truncate">
            <span className="text-text-muted">
              {secondLast.role === 'user' ? 'you · ' : 'jarvis · '}
            </span>
            {secondLast.content}
          </div>
        )}
        {lastMsg && (
          <div
            className={`truncate ${lastMsg.role === 'user' ? 'text-text-secondary' : 'text-text-primary'}`}
          >
            <span
              className={lastMsg.role === 'user' ? 'text-text-muted' : 'text-accent-cyan'}
            >
              {lastMsg.role === 'user' ? 'you · ' : 'jarvis · '}
            </span>
            {lastMsg.content}
          </div>
        )}
      </div>
      <div className="text-[10px] lowercase text-text-muted">openclaw tui · ws:18789</div>
    </div>
  )
}
