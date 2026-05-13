// Renderer-side WebSocket client for OpenClaw gateway at ws://127.0.0.1:18789.
//
// Protocol assumptions (best-effort, tolerant):
//   send →  { type: 'message', content: string }
//   recv →  any JSON; we extract a text/token/content/delta field and
//           treat objects with type/event in {'done','end','complete'} as
//           the end of an assistant turn. Plain string frames are treated
//           as token text.
//
// Reconnect: exponential backoff, capped at 8s. Reconnects start the moment
// the socket closes and a session is interested (the chat panel is open).

import { useCallback, useEffect, useRef, useState } from 'react'

const URL = 'ws://127.0.0.1:18789'
const MIN_BACKOFF = 500
const MAX_BACKOFF = 8000

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export type StreamEvent =
  | { kind: 'token'; text: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

type Options = {
  onEvent: (e: StreamEvent) => void
}

type ParsedFrame =
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'ignore' }

const TOKEN_KEYS = ['token', 'delta', 'text', 'content', 'chunk', 'output_text']
const DONE_VALUES = new Set(['done', 'end', 'complete', 'stop', 'finished', 'finish'])

function extractText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : extractText(v) ?? ''))
      .filter(Boolean)
      .join('')
  }
  if (value && typeof value === 'object') {
    for (const k of TOKEN_KEYS) {
      const t = extractText((value as Record<string, unknown>)[k])
      if (t) return t
    }
  }
  return null
}

function parseFrame(raw: string): ParsedFrame {
  const trimmed = raw.trim()
  if (!trimmed) return { type: 'ignore' }
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { type: 'token', text: trimmed }
  }
  let obj: unknown
  try {
    obj = JSON.parse(trimmed)
  } catch {
    return { type: 'token', text: trimmed }
  }
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    const tag = typeof o.type === 'string' ? o.type.toLowerCase() : null
    const event = typeof o.event === 'string' ? o.event.toLowerCase() : null
    if ((tag && DONE_VALUES.has(tag)) || (event && DONE_VALUES.has(event))) {
      return { type: 'done' }
    }
    if (tag === 'error' || event === 'error') {
      const msg = typeof o.message === 'string' ? o.message : 'jarvis error'
      return { type: 'error', message: msg }
    }
    const text = extractText(o)
    if (text) return { type: 'token', text }
  }
  return { type: 'ignore' }
}

export function useJarvisSocket({ onEvent }: Options): {
  state: ConnectionState
  error: string | null
  send: (content: string) => boolean
  reconnect: () => void
} {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef<number>(MIN_BACKOFF)
  const reconnectTimer = useRef<number | null>(null)
  const wantConnected = useRef(true)
  const [state, setState] = useState<ConnectionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  const connect = useCallback(() => {
    if (wsRef.current) return
    setState('connecting')
    setError(null)
    let ws: WebSocket
    try {
      ws = new WebSocket(URL)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setState('error')
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.addEventListener('open', () => {
      backoffRef.current = MIN_BACKOFF
      setState('open')
      setError(null)
    })

    ws.addEventListener('message', (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : ''
      if (!data) return
      const frame = parseFrame(data)
      if (frame.type === 'token') handlerRef.current({ kind: 'token', text: frame.text })
      else if (frame.type === 'done') handlerRef.current({ kind: 'done' })
      else if (frame.type === 'error') handlerRef.current({ kind: 'error', message: frame.message })
    })

    ws.addEventListener('error', () => {
      // WebSocket Error events don't include useful info in the browser; we
      // surface a generic message and rely on 'close' for reconnect logic.
      setError('connection error')
      setState('error')
    })

    ws.addEventListener('close', () => {
      wsRef.current = null
      setState((cur) => (cur === 'error' ? 'error' : 'closed'))
      if (wantConnected.current) scheduleReconnect()
    })
  }, [])

  function scheduleReconnect(): void {
    if (reconnectTimer.current !== null) return
    const delay = backoffRef.current
    backoffRef.current = Math.min(delay * 2, MAX_BACKOFF)
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null
      if (wantConnected.current) connect()
    }, delay)
  }

  useEffect(() => {
    wantConnected.current = true
    connect()
    return () => {
      wantConnected.current = false
      if (reconnectTimer.current !== null) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
    }
  }, [connect])

  const send = useCallback((content: string): boolean => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    try {
      ws.send(JSON.stringify({ type: 'message', content }))
      return true
    } catch (err) {
      console.error('[jarvis] send failed:', err)
      return false
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }
    backoffRef.current = MIN_BACKOFF
    connect()
  }, [connect])

  return { state, error, send, reconnect }
}
