import { useMemo, useState } from 'react'
import type { PortfolioRow } from '../../../../shared/types'
import { useAppStore } from '@stores/appStore'
import { Num } from '@components/common/Number'

type SortKey =
  | 'ticker'
  | 'name'
  | 'shares'
  | 'price'
  | 'day_change'
  | 'day_change_pct'
  | 'pnl'
  | 'weight'

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Name' },
  { key: 'shares', label: 'Shares', align: 'right' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'day_change', label: 'Day Chg', align: 'right' },
  { key: 'day_change_pct', label: 'Day Chg %', align: 'right' },
  { key: 'pnl', label: 'P&L', align: 'right' },
  { key: 'weight', label: 'Weight', align: 'right' }
]

type Props = {
  rows: PortfolioRow[]
}

export function HoldingsGrid({ rows }: Props): React.JSX.Element {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'weight',
    dir: 'desc'
  })
  const openDrawer = useAppStore((s) => s.openDrawer)

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return arr
  }, [rows, sort])

  function toggleSort(key: SortKey): void {
    setSort((cur) =>
      cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    )
  }

  return (
    <section className="card flex flex-col h-full overflow-hidden">
      <div className="card-header">
        <span className="card-eyebrow">Holdings</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          <span className="font-mono text-text-secondary">{rows.length}</span> positions
        </span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 backdrop-blur-md bg-surface/85">
            <tr className="border-b border-border/80">
              <th className="w-6 px-2 py-2"></th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-medium cursor-pointer select-none text-text-muted hover:text-accent-cyan transition-colors ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.key === c.key && (
                      <span className="text-accent-cyan">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.ticker}
                onClick={() => !r.is_cash && openDrawer({ kind: 'chart', ticker: r.ticker })}
                className={`group border-b border-border/40 transition-colors ${
                  i % 2 === 1 ? 'bg-white/[0.012]' : ''
                } ${r.is_cash ? '' : 'hover:bg-accent-cyan/[0.04] cursor-pointer'}`}
              >
                <td className="px-2 py-2.5">
                  <span
                    title="Signal placeholder — Agent 3 will fill"
                    className="block w-1.5 h-1.5 rounded-full bg-border-active group-hover:bg-accent-cyan group-hover:shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all"
                  />
                </td>
                <td className="px-3 py-2.5 font-mono text-text-primary text-[13px] tracking-wide">
                  {r.ticker}
                </td>
                <td className="px-3 py-2.5 text-text-secondary text-[12px]">{r.name}</td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={r.shares} decimals={r.shares % 1 === 0 ? 0 : 2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={r.price} prefix="$" decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={r.day_change} prefix="$" signed colored decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={r.day_change_pct} suffix="%" signed colored decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={r.pnl} prefix="$" signed colored decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">
                  <Num value={r.weight} suffix="%" decimals={1} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-6 py-12 text-center">
                  <div className="card-eyebrow mb-2">no positions</div>
                  <div className="text-sm text-text-secondary">
                    Add holdings in <span className="text-accent-cyan">Settings</span> to populate
                    the terminal.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
