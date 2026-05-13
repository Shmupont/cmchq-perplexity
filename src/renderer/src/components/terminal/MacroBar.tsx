import type { MacroChip } from '../../../../shared/types'
import { Num } from '@components/common/Number'

type Props = {
  chips: MacroChip[]
}

export function MacroBar({ chips }: Props): React.JSX.Element {
  return (
    <section className="border-t border-border bg-surface">
      <div className="flex items-center gap-6 overflow-x-auto px-5 py-2.5">
        {chips.length === 0 && <span className="text-[11px] text-text-muted">Loading macro…</span>}
        {chips.map((c) => (
          <div key={c.ticker} className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">{c.label}</span>
            <Num value={c.price} decimals={2} className="text-text-primary" />
            <Num
              value={c.change_pct}
              suffix="%"
              signed
              colored
              decimals={2}
              className="text-[11px]"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
