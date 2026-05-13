import type { MacroChip } from '../../../../shared/types'
import { Num } from '@components/common/Number'

type Props = {
  chips: MacroChip[]
}

export function MacroBar({ chips }: Props): React.JSX.Element {
  return (
    <section className="relative border-t border-border/70 bg-surface/70 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 divider-soft" />
      <div className="flex items-center gap-5 overflow-x-auto px-5 py-2.5">
        {chips.length === 0 && (
          <span className="text-[11px] text-text-muted animate-pulse">loading macro…</span>
        )}
        {chips.map((c) => {
          const positive = typeof c.change_pct === 'number' && c.change_pct > 0
          const negative = typeof c.change_pct === 'number' && c.change_pct < 0
          return (
            <div
              key={c.ticker}
              className="flex items-center gap-2 whitespace-nowrap shrink-0 group"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted group-hover:text-accent-cyan transition-colors">
                {c.label}
              </span>
              <Num
                value={c.price}
                decimals={2}
                className="text-text-primary text-[13px] tracking-wide"
              />
              <div
                className={`flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] transition-all ${
                  positive
                    ? 'bg-positive/10 ring-1 ring-positive/25'
                    : negative
                      ? 'bg-negative/10 ring-1 ring-negative/25'
                      : 'bg-white/[0.03] ring-1 ring-border/60'
                }`}
              >
                <Num
                  value={c.change_pct}
                  suffix="%"
                  signed
                  colored
                  decimals={2}
                  className="text-[11px]"
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
