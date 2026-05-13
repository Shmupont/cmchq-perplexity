import { useMemo } from 'react'
import { BrainConstellation } from '@components/home/BrainConstellation'
import { Num } from '@components/common/Number'
import { useAppStore } from '@stores/appStore'
import { usePortfolio } from '@hooks/usePortfolio'

export function Home(): React.JSX.Element {
  const { data } = usePortfolio()
  const setPage = useAppStore((s) => s.setPage)

  const movers = useMemo(() => {
    const rows = data?.rows ?? []
    return [...rows]
      .filter((r) => !r.is_cash)
      .sort((a, b) => Math.abs(b.day_change_pct) - Math.abs(a.day_change_pct))
      .slice(0, 3)
  }, [data])

  return (
    <div className="flex flex-col h-full">
      {/* Top half — brain graph hero */}
      <div
        className="relative flex-1 min-h-0 border-b border-border cursor-pointer group"
        onClick={() => setPage('brain')}
        title="Open Brain"
      >
        <BrainConstellation />
        <div className="pointer-events-none absolute top-5 left-6">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">Second brain</div>
          <div className="text-2xl font-medium text-text-primary mt-1">Mission Control</div>
          <div className="text-xs text-text-secondary mt-1">
            Your notes, contacts, projects — one graph.
          </div>
        </div>
        <div className="absolute top-5 right-6 text-[10px] uppercase tracking-wider text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          → Brain
        </div>
      </div>

      {/* Bottom half — 3-column quick glance */}
      <div className="grid grid-cols-3 gap-4 p-4">
        <Tile title="Portfolio" icon="📊" onOpen={() => setPage('terminal')} openLabel="Terminal">
          <div className="flex items-baseline gap-2">
            <Num
              value={data?.total_value ?? null}
              prefix="$"
              decimals={2}
              className="text-2xl text-text-primary"
            />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span>
              <span className="text-text-muted mr-1">Day</span>
              <Num value={data?.day_pnl ?? null} prefix="$" signed colored decimals={2} />
            </span>
            <span className="text-text-muted">·</span>
            <Num value={data?.day_pnl_pct ?? null} suffix="%" signed colored decimals={2} />
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">Top Movers</div>
            {movers.length === 0 && <div className="text-xs text-text-muted">—</div>}
            {movers.map((r) => (
              <div key={r.ticker} className="flex items-center justify-between text-xs">
                <span className="font-mono text-text-secondary">{r.ticker}</span>
                <Num value={r.day_change_pct} suffix="%" signed colored decimals={2} />
              </div>
            ))}
          </div>
        </Tile>

        <Tile title="Today" icon="📋" onOpen={() => setPage('briefing')} openLabel="Briefing">
          <div className="text-xs text-text-secondary leading-relaxed space-y-2">
            <p>The daily brief generates at 7:00 AM PT.</p>
            <p className="text-text-muted">
              Agent 3 builds this — until then it&apos;s quiet here.
            </p>
            <ul className="mt-3 space-y-1.5 text-text-muted">
              <li>· Overnight portfolio moves</li>
              <li>· Top emails across 3 accounts</li>
              <li>· Brain follow-ups</li>
              <li>· Macro context</li>
            </ul>
          </div>
        </Tile>

        <Tile title="Inbox" icon="📧" onOpen={() => setPage('inbox')} openLabel="Inbox">
          <div className="text-xs text-text-secondary leading-relaxed">
            <p>Top urgent email per account, triaged by Claude.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[{ tag: 'Personal' }, { tag: 'Business' }, { tag: 'School' }].map((c) => (
                <div
                  key={c.tag}
                  className="card-flat p-2 text-center text-text-muted text-[10px] uppercase tracking-wider"
                >
                  {c.tag}
                  <div className="mt-2 h-1 rounded-full bg-border" />
                </div>
              ))}
            </div>
            <p className="text-text-muted mt-3">Agent 2 wires Gmail × 3 + AI triage.</p>
          </div>
        </Tile>
      </div>
    </div>
  )
}

function Tile({
  title,
  icon,
  onOpen,
  openLabel,
  children
}: {
  title: string
  icon: string
  onOpen: () => void
  openLabel: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="card p-4 flex flex-col gap-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            {icon}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted">{title}</span>
        </div>
        <button
          onClick={onOpen}
          className="text-[10px] uppercase tracking-wider text-text-secondary hover:text-accent-cyan transition-colors opacity-0 group-hover:opacity-100"
        >
          → {openLabel}
        </button>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  )
}
