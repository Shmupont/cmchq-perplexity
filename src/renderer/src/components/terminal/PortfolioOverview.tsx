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

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
            Total Portfolio Value
          </div>
          <div className="flex items-baseline gap-3">
            <Num
              value={total}
              prefix="$"
              decimals={2}
              className="text-4xl font-medium text-text-primary"
            />
            {loading && <span className="text-[10px] text-text-muted animate-pulse">syncing…</span>}
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted mr-2">Day</span>
              <Num value={day_pnl} prefix="$" signed colored decimals={2} className="mr-1" />
              <span className="text-text-muted">·</span>
              <Num value={day_pnl_pct} suffix="%" signed colored decimals={2} className="ml-1" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted mr-2">
                All Time
              </span>
              <Num value={total_pnl} prefix="$" signed colored decimals={2} className="mr-1" />
              <span className="text-text-muted">·</span>
              <Num value={total_pnl_pct} suffix="%" signed colored decimals={2} className="ml-1" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1 card-flat p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
                  period === p
                    ? 'bg-surface-elevated text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            {data?.as_of ? new Date(data.as_of).toLocaleTimeString() : '—'} · live
          </div>
        </div>
      </div>
    </section>
  )
}
