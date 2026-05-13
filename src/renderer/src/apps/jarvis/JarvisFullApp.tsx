import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Send, RotateCw, Loader2 } from 'lucide-react'
import type { JarvisMessage } from '../../../../shared/jarvis-types'
import { useJarvisSocket, type StreamEvent } from './useJarvisSocket'

type ChatMessage = JarvisMessage | { id: string; role: 'jarvis'; content: string; streaming: true }

function isStreaming(m: ChatMessage): m is {
  id: string
  role: 'jarvis'
  content: string
  streaming: true
} {
  return 'streaming' in m && m.streaming === true
}

export function JarvisFullApp(): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const streamBufRef = useRef('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Load history on mount
  useEffect(() => {
    window.api.jarvis
      .history()
      .then((msgs) => setMessages(msgs))
      .catch((err) => console.error('[jarvis] history:', err))
  }, [])

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const handleEvent = useCallback((e: StreamEvent) => {
    if (e.kind === 'token') {
      streamBufRef.current += e.text
      const text = streamBufRef.current
      setMessages((cur) => {
        const last = cur.at(-1)
        if (last && isStreaming(last)) {
          return [...cur.slice(0, -1), { ...last, content: text }]
        }
        return [
          ...cur,
          { id: `stream-${Date.now()}`, role: 'jarvis', content: text, streaming: true }
        ]
      })
    } else if (e.kind === 'done') {
      const final = streamBufRef.current
      streamBufRef.current = ''
      setStreaming(false)
      if (final.trim().length > 0) {
        // Persist + replace streaming message with the saved row
        window.api.jarvis
          .append('jarvis', final)
          .then((saved) => {
            setMessages((cur) => {
              const last = cur.at(-1)
              if (last && isStreaming(last)) return [...cur.slice(0, -1), saved]
              return [...cur, saved]
            })
          })
          .catch((err) => console.error('[jarvis] persist:', err))
      } else {
        // No content — drop the placeholder
        setMessages((cur) => (cur.at(-1) && isStreaming(cur.at(-1)!) ? cur.slice(0, -1) : cur))
      }
    } else if (e.kind === 'error') {
      streamBufRef.current = ''
      setStreaming(false)
      setMessages((cur) => [
        ...cur.filter((m) => !isStreaming(m)),
        {
          id: -Math.floor(Math.random() * 1e9),
          role: 'jarvis',
          content: `_error: ${e.message}_`,
          created_at: new Date().toISOString()
        }
      ])
    }
  }, [])

  const { state, error, send, reconnect } = useJarvisSocket({ onEvent: handleEvent })

  async function handleSend(): Promise<void> {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    streamBufRef.current = ''
    // Persist user message first so the tile reflects it immediately
    try {
      const saved = await window.api.jarvis.append('user', text)
      setMessages((cur) => [...cur, saved])
    } catch (err) {
      console.error('[jarvis] persist user:', err)
    }
    const ok = send(text)
    if (!ok) {
      setMessages((cur) => [
        ...cur,
        {
          id: -Math.floor(Math.random() * 1e9),
          role: 'jarvis',
          content: '_gateway offline — start openclaw on ws://127.0.0.1:18789_',
          created_at: new Date().toISOString()
        }
      ])
      return
    }
    setStreaming(true)
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const stateLabel: Record<typeof state, string> = {
    idle: 'idle',
    connecting: 'connecting…',
    open: 'online',
    closed: 'offline',
    error: 'offline'
  }
  const stateColor: Record<typeof state, string> = {
    idle: 'text-text-muted',
    connecting: 'text-warning',
    open: 'text-positive',
    closed: 'text-text-muted',
    error: 'text-negative'
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-text-secondary" strokeWidth={1.5} />
          <h1 className="text-base font-medium text-text-primary lowercase">jarvis</h1>
          <span className="text-[11px] lowercase text-text-muted">
            openclaw tui · ws://127.0.0.1:18789
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] lowercase ${stateColor[state]}`}>{stateLabel[state]}</span>
          <button
            onClick={reconnect}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            title="Reconnect"
          >
            <RotateCw size={12} />
          </button>
        </div>
      </header>

      {error && state !== 'open' && (
        <div className="px-6 py-2 border-b border-border bg-negative/10 text-[11px] text-negative">
          {error} — start the OpenClaw gateway on ws://127.0.0.1:18789
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-text-muted lowercase">
            ask jarvis something. messages persist across restarts.
          </div>
        )}
        {messages.map((m, idx) => (
          <MessageBubble key={`${m.id}-${idx}`} message={m} />
        ))}
      </div>

      <footer className="border-t border-border bg-surface p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={state === 'open' ? 'message jarvis…' : 'connecting to gateway…'}
            disabled={state !== 'open' || streaming}
            rows={1}
            className="flex-1 resize-none min-h-[36px] max-h-[160px] px-3 py-2 rounded-md bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || state !== 'open' || streaming}
            className="h-9 px-3 rounded-md bg-accent-blue/15 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/25 transition-colors disabled:opacity-40 flex items-center gap-1.5 text-[11px] lowercase"
          >
            {streaming ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            send
          </button>
        </div>
      </footer>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-surface-elevated border border-border text-text-primary'
            : 'bg-surface border border-border/60 text-text-primary'
        }`}
      >
        <div
          className={`text-[10px] lowercase mb-1 ${isUser ? 'text-text-muted' : 'text-accent-cyan'}`}
        >
          {isUser ? 'you' : 'jarvis'}
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none jarvis-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {isStreaming(message) && (
              <span className="inline-block w-1 h-3 ml-0.5 align-middle bg-accent-cyan animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
