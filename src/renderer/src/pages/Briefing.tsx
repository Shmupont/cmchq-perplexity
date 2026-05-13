import { useCallback, useEffect, useState } from 'react'
import { BriefView } from '@components/briefing/BriefView'
import { BriefArchive } from '@components/briefing/BriefArchive'
import type { Briefing, BriefType } from '../../../shared/agent-types'

const TABS: BriefType[] = ['daily', 'weekly']

export function Briefing(): React.JSX.Element {
  const [tab, setTab] = useState<BriefType>('daily')
  const [current, setCurrent] = useState<Briefing | null>(null)
  const [archive, setArchive] = useState<Briefing[]>([])
  const [regenerating, setRegenerating] = useState(false)
  const [needsKey, setNeedsKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (type: BriefType) => {
    const [latest, history] = await Promise.all([
      window.api.briefing.latest(type),
      window.api.briefing.history(type, 20)
    ])
    setCurrent(latest)
    setArchive(history)
  }, [])

  useEffect(() => {
    setError(null)
    load(tab)
  }, [tab, load])

  useEffect(() => {
    window.api.keys.status().then((s) => setNeedsKey(!s.anthropic))
  }, [])

  async function regenerate(): Promise<void> {
    if (regenerating) return
    setRegenerating(true)
    setError(null)
    try {
      const brief = await window.api.briefing.regenerate(tab)
      setCurrent(brief)
      const history = await window.api.briefing.history(tab, 20)
      setArchive(history)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-hidden">
        <header className="flex items-baseline gap-4">
          <h1 className="text-xl font-semibold">Briefing</h1>
          <div className="flex gap-1 bg-surface rounded-md p-1 border border-border">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-xs uppercase tracking-wider transition-colors ${
                  tab === t
                    ? 'bg-surface-elevated text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="text-xs text-text-secondary">
            {tab === 'daily'
              ? 'auto-generated 7:00 AM PT'
              : 'auto-generated Sundays 8:00 PM PT'}
          </span>
        </header>

        {needsKey && (
          <div className="card border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
            No Anthropic API key set. Go to Settings → API Keys to add one before regenerating briefs.
          </div>
        )}

        {error && (
          <div className="card border border-negative/40 bg-negative/5 p-3 text-xs text-negative">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[1fr_280px] gap-4 flex-1 min-h-0">
          <BriefView
            brief={current}
            onRegenerate={regenerate}
            regenerating={regenerating}
          />
          <BriefArchive
            briefings={archive}
            selectedId={current?.id ?? null}
            onSelect={setCurrent}
          />
        </div>
      </div>
    </div>
  )
}
