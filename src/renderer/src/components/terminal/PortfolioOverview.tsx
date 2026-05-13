import { useState } from 'react'
import type { PortfolioSummary, Period } from '../../../../shared/types'
import { Num } from '@components/common/Number'

const PERIODS: Period[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y']

type Props = {
  data: PortfolioSummary | null
  loading: boolean
}

export function PortfolioOverview({ data, loading }: Props): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('1D')

  const day_pnl = data?.day_pnl ?? null
  const day_pnl_pct = data?.day_pnl_pct ?? null
  const total = data?.total_value ?? null
  const total_pnl = data?.total_pnl ?? null
  const total_pnl_pct = data?.total_pnl_pct ?? null

  const dayPositive = typeof day_pnl === 'number' && day_pnl > 0
  const dayNegative = typeof day_pnl === 'number' && day_pnl < 0
  const glowClass = dayPositive ? 'num-glow-pos' : dayNegative ? 'num-glow-neg' : ''

  return (
    <section className="card p-6 overflow-hidden">
      {/* Subtle inner sheen */}
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-accent-blue/[0.04] via-transparent to-transparent" />

      <div className="relative flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="card-eyebrow">Total Portfolio Value</span>
            {loading && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent-cyan flex items-center gap-1.5">
                <span className="status-dot is-running" />
                syncing
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <Num
              value={total}
              prefix="$"
              decimals={2}
              className={`text-[52px] leading-none tracking-tight text-text-primary ${glowClass}`}
            />
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="card-eyebrow">Day</span>
              <Num value={day_pnl} prefix="$" signed colored decimals={2} />
              <span className="text-text-muted">·</span>
              <Num value={day_pnl_pct} suffix="%" signed colored decimals={2} />
            </div>
            <div className="h-4 w-px bg-border/70" />
            <div className="flex items-center gap-2">
              <span className="card-eyebrow">All Time</span>
              <Num value={total_pnl} prefix="$" signed colored decimals={2} />
              <span className="text-text-muted">·</span>
              <Num value={total_pnl_pct} suffix="%" signed colored decimals={2} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="segmented">
            {PERIODS.map((p) => (
              <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-muted">
            <span className="status-dot is-live" />
            {data?.as_of
              ? new Date(data.as_of).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
              : '—'}{' '}
            <span className="text-accent-cyan/80">live</span>
          </div>
        </div>
      </div>
    </section>
  )
}
