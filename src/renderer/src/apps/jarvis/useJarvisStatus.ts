// Lightweight ping: try a quick WebSocket connection to the gateway, report
// whether it's reachable. Used by the tile preview to show online/offline.

import { useEffect, useState } from 'react'

const URL = 'ws://127.0.0.1:18789'

export function useJarvisStatus(intervalMs = 8000): boolean {
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    function ping(): void {
      let settled = false
      let ws: WebSocket
      try {
        ws = new WebSocket(URL)
      } catch {
        if (!cancelled) setOnline(false)
        schedule()
        return
      }
      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        try {
          ws.close()
        } catch {
          /* ignore */
        }
        if (!cancelled) setOnline(false)
        schedule()
      }, 2500)
      ws.addEventListener('open', () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        try {
          ws.close()
        } catch {
          /* ignore */
        }
        if (!cancelled) setOnline(true)
        schedule()
      })
      ws.addEventListener('error', () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (!cancelled) setOnline(false)
        schedule()
      })
    }

    function schedule(): void {
      if (cancelled) return
      timer = window.setTimeout(ping, intervalMs)
    }

    ping()
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [intervalMs])

  return online
}
