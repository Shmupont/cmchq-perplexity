// Chat with the second brain. RAG pipeline runs in main:
// (1) embeds the question, (2) retrieves top-10 vault chunks, (3) streams
// Claude's reply over EVT.BRAIN_CHAT_TOKEN.

import { useEffect, useRef, useState } from 'react'
import type {
  BrainChatMessage,
  BrainChatModel,
  BrainChatStreamEvent,
  BrainSearchHit
} from '../../../../shared/brain-types'

type Msg = BrainChatMessage & { id: string; sources?: BrainSearchHit[] }

type Props = {
  onOpenNote?: (id: string) => void
}

export function BrainChat({ onOpenNote }: Props): React.JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [model, setModel] = useState<BrainChatModel>('sonnet')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Subscribe to streaming events
  useEffect(() => {
    const off = window.api.brain.onChatEvent((ev: BrainChatStreamEvent) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === ev.id)
        if (idx === -1) return prev
        const next = prev.slice()
        const cur = next[idx]
        if (ev.kind === 'token') {
          next[idx] = { ...cur, content: cur.content + ev.token }
        } else if (ev.kind === 'sources') {
          next[idx] = { ...cur, sources: ev.sources }
        } else if (ev.kind === 'error') {
          next[idx] = { ...cur, content: cur.content + `\n\n_error: ${ev.message}_` }
        }
        return next
      })
      if (ev.kind === 'done' || ev.kind === 'error') {
        setStreaming(false)
        setPendingId(null)
      }
    })
    return off
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function send(): Promise<void> {
    const text = input.trim()
    if (!text || streaming) return
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantId = crypto.randomUUID()
    const assistantMsg: Msg = { id: assistantId, role: 'assistant', content: '' }
    const nextHistory: BrainChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content
    }))
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    setPendingId(assistantId)
    try {
      await window.api.brain.chat({ id: assistantId, messages: nextHistory, model })
    } catch (err) {
      console.error('[BrainChat] send failed:', err)
      setStreaming(false)
      setPendingId(null)
    }
  }

  async function cancel(): Promise<void> {
    if (!pendingId) return
    try {
      await window.api.brain.cancelChat(pendingId)
    } catch (err) {
      console.error('[BrainChat] cancel failed:', err)
    }
    setStreaming(false)
    setPendingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/70">
        <div>
          <div className="card-eyebrow-accent">Brain Chat</div>
          <div className="text-xs text-text-secondary mt-1">
            Ask anything about your notes — I have all of them.
          </div>
        </div>
        <div className="segmented">
          <button data-active={model === 'sonnet'} onClick={() => setModel('sonnet')}>
            Fast
          </button>
          <button data-active={model === 'opus'} onClick={() => setModel('opus')}>
            Deep
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-text-muted py-12">
            <div className="card-eyebrow-accent mb-3">examples</div>
            <ul className="space-y-1.5">
              <li className="text-text-secondary">"what am I working on with Mark?"</li>
              <li className="text-text-secondary">"summarize my goals for this quarter"</li>
              <li className="text-text-secondary">
                "who have I talked to about portfolio strategy?"
              </li>
            </ul>
          </div>
        )}
        {messages.map((m) => {
          const isStreamingThis = streaming && pendingId === m.id
          return (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm transition-all ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-accent-blue/[0.18] to-accent-blue/[0.08] border border-accent-blue/30 text-text-primary backdrop-blur-md'
                    : 'glass text-text-primary'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content ||
                    (isStreamingThis ? (
                      <span className="inline-flex items-center gap-1.5 text-text-muted">
                        <span className="status-dot is-running" />
                        <span className="text-[11px] uppercase tracking-[0.18em]">thinking</span>
                      </span>
                    ) : (
                      ''
                    ))}
                  {isStreamingThis && m.content && (
                    <span
                      className="inline-block w-[6px] h-[14px] ml-0.5 align-middle bg-accent-cyan"
                      style={{ animation: 'blink-cursor 1s steps(1) infinite' }}
                    />
                  )}
                </div>
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/70">
                    <div className="card-eyebrow mb-1.5">sources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.slice(0, 6).map((s, i) => (
                        <button
                          key={`${m.id}-src-${i}`}
                          onClick={() => onOpenNote?.(s.id)}
                          className="text-[10px] px-2 py-0.5 rounded border border-border/80 bg-surface/60 hover:border-accent-cyan/60 hover:text-accent-cyan hover:bg-accent-cyan/[0.06] transition-all"
                          title={s.snippet}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <footer className="border-t border-border/70 p-3 bg-surface/40 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask your second brain…"
            rows={2}
            className="flex-1 resize-none rounded-md bg-surface/60 border border-border/80 text-sm px-3 py-2 outline-none focus:border-accent-cyan/60 transition-colors backdrop-blur-md"
          />
          {streaming ? (
            <button
              onClick={cancel}
              className="h-10 px-3 rounded-md border border-negative/40 text-negative hover:bg-negative/10 transition-colors text-[11px] uppercase tracking-[0.18em]"
            >
              Stop
            </button>
          ) : (
            <button onClick={send} disabled={!input.trim()} className="btn-primary h-10">
              Send
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
