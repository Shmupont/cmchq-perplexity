import { useCallback, useEffect, useState } from 'react'
import type { KeyName } from '../../../../shared/agent-types'

const KEYS: Array<{ name: KeyName; label: string; hint: string }> = [
  {
    name: 'anthropic',
    label: 'Anthropic API key',
    hint: 'Powers the Crew agents and the Briefing generator. Starts with sk-ant-…'
  },
  {
    name: 'openai',
    label: 'OpenAI API key',
    hint: 'Powers Brain note embeddings (used by Agent 2). Starts with sk-proj-…'
  }
]

export function ApiKeysSection(): React.JSX.Element {
  const [status, setStatus] = useState<Record<KeyName, boolean>>({
    anthropic: false,
    openai: false
  })
  const [drafts, setDrafts] = useState<Record<KeyName, string>>({ anthropic: '', openai: '' })
  const [busy, setBusy] = useState<KeyName | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const s = await window.api.keys.status()
    setStatus(s)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function save(name: KeyName): Promise<void> {
    const value = drafts[name].trim()
    if (!value) return
    setBusy(name)
    setError(null)
    try {
      const next = await window.api.keys.set(name, value)
      setStatus(next)
      setDrafts((d) => ({ ...d, [name]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function clear(name: KeyName): Promise<void> {
    setBusy(name)
    setError(null)
    try {
      const next = await window.api.keys.clear(name)
      setStatus(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card-elevated p-5 mb-6">
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1">API Keys</div>
      <div className="text-xs text-text-secondary mb-4">
        Stored encrypted via Electron safeStorage in your user data directory. Never written to disk
        in plain text.
      </div>
      <div className="flex flex-col gap-3">
        {KEYS.map(({ name, label, hint }) => {
          const present = status[name]
          return (
            <div key={name} className="card-flat p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary">{label}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      present
                        ? 'bg-positive/15 text-positive border border-positive/30'
                        : 'bg-warning/15 text-warning border border-warning/30'
                    }`}
                  >
                    {present ? 'set' : 'not set'}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">{hint}</div>
              </div>
              <input
                type="password"
                value={drafts[name]}
                onChange={(e) => setDrafts((d) => ({ ...d, [name]: e.target.value }))}
                placeholder={present ? 'replace key…' : 'paste key…'}
                className="input num w-[340px]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => save(name)}
                disabled={busy === name || !drafts[name].trim()}
                className="h-9 px-3 rounded-md bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-40 text-sm"
              >
                Save
              </button>
              {present && (
                <button
                  onClick={() => clear(name)}
                  disabled={busy === name}
                  className="h-9 px-3 rounded-md border border-border text-text-secondary hover:text-negative hover:border-negative/40 transition-colors text-sm disabled:opacity-40"
                >
                  Clear
                </button>
              )}
            </div>
          )
        })}
      </div>
      {error && <div className="text-sm text-negative mt-3">{error}</div>}
    </section>
  )
}
