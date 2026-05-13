import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentSummary, AgentEvent, AgentStreamMessage } from '../../../../shared/agent-types'

type RunState = 'idle' | 'running' | 'done' | 'error'

type ToolCall = {
  tool: string
  input: unknown
  result?: { ok: boolean; preview: string }
}

export function TaskRunner({
  agent,
  onTaskComplete
}: {
  agent: AgentSummary
  onTaskComplete: () => void
}): React.JSX.Element {
  const [description, setDescription] = useState('')
  const [state, setState] = useState<RunState>('idle')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tools, setTools] = useState<ToolCall[]>([])
  const outputRef = useRef<HTMLDivElement | null>(null)

  // Track the task id of the in-flight run. We capture it from the first
  // stream message we receive (events arrive before the run() promise resolves).
  const activeTaskIdRef = useRef<number | null>(null)
  const stateRef = useRef<RunState>('idle')

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setDescription('')
    setState('idle')
    setOutput('')
    setError(null)
    setTools([])
    activeTaskIdRef.current = null
  }, [agent.id])

  useEffect(() => {
    function handleEvent(ev: AgentEvent): void {
      switch (ev.type) {
        case 'text':
          setOutput((o) => o + ev.delta)
          break
        case 'tool_use':
          setTools((t) => [...t, { tool: ev.tool, input: ev.input }])
          break
        case 'tool_result':
          setTools((t) => {
            const next = [...t]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].tool === ev.tool && !next[i].result) {
                next[i] = { ...next[i], result: { ok: ev.ok, preview: ev.preview } }
                break
              }
            }
            return next
          })
          break
        case 'done':
          setState('done')
          onTaskComplete()
          break
        case 'error':
          setError(ev.message)
          setState('error')
          break
      }
    }

    const unsubscribe = window.api.agents.onStream((msg: AgentStreamMessage) => {
      if (stateRef.current !== 'running') return
      if (activeTaskIdRef.current === null) {
        activeTaskIdRef.current = msg.taskId
      } else if (activeTaskIdRef.current !== msg.taskId) {
        return
      }
      handleEvent(msg.event)
    })
    return unsubscribe
  }, [onTaskComplete])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output, tools])

  async function run(): Promise<void> {
    if (!description.trim() || state === 'running') return
    setState('running')
    setOutput('')
    setError(null)
    setTools([])
    activeTaskIdRef.current = null
    try {
      await window.api.agents.run(agent.id, description.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-4 min-h-0 flex-1">
      <div className="flex items-baseline gap-2">
        <span className="text-lg" aria-hidden>
          {agent.icon}
        </span>
        <span className="text-sm font-medium text-text-primary">{agent.name}</span>
        <span className="text-[11px] text-text-secondary">— {agent.description}</span>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void run()
          }
        }}
        placeholder={`What do you want ${agent.name} to do? (⌘↵ to run)`}
        rows={3}
        className="input p-3 text-sm resize-none"
        disabled={state === 'running'}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={state === 'running' || !description.trim()}
          className="h-9 px-4 rounded-md bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-40"
        >
          {state === 'running' ? 'Running…' : 'Run'}
        </button>
        {state === 'running' && (
          <span className="text-[11px] text-text-muted">streaming response</span>
        )}
        {state === 'done' && <span className="text-[11px] text-positive">complete</span>}
        {state === 'error' && <span className="text-[11px] text-negative">error: {error}</span>}
      </div>

      {(output || tools.length > 0) && (
        <div
          ref={outputRef}
          className="card-flat p-4 overflow-auto flex-1 min-h-[200px] max-h-[500px] text-sm leading-relaxed"
        >
          {tools.map((t, i) => (
            <div
              key={i}
              className="mb-3 text-[11px] font-mono text-text-secondary border-l-2 border-accent-cyan/40 pl-2"
            >
              <div>
                <span className="text-accent-cyan">→ {t.tool}</span>
                <span className="text-text-muted ml-2">
                  {JSON.stringify(t.input).slice(0, 100)}
                </span>
              </div>
              {t.result && (
                <div className={t.result.ok ? 'text-text-muted' : 'text-negative'}>
                  ← {t.result.preview}
                </div>
              )}
            </div>
          ))}
          {output && (
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
