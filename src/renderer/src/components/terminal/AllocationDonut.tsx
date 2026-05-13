import { useMemo, useState } from 'react'
import type { PortfolioRow } from '../../../../shared/types'
import { SECTOR_COLORS } from '../../../../main/constants'
import { Num } from '@components/common/Number'

type Slice = {
  key: string
  value: number
  weight: number
  color: string
  rows: PortfolioRow[]
}

type Props = {
  rows: PortfolioRow[]
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180.0
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  rInner: number,
  start: number,
  end: number
): string {
  const [x1, y1] = polarToCartesian(cx, cy, r, end)
  const [x2, y2] = polarToCartesian(cx, cy, r, start)
  const [x3, y3] = polarToCartesian(cx, cy, rInner, start)
  const [x4, y4] = polarToCartesian(cx, cy, rInner, end)
  const largeArc = end - start <= 180 ? 0 : 1
  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${x4} ${y4}`,
    'Z'
  ].join(' ')
}

export function AllocationDonut({ rows }: Props): React.JSX.Element {
  const [hover, setHover] = useState<string | null>(null)

  const slices = useMemo<Slice[]>(() => {
    const map = new Map<string, Slice>()
    let total = 0
    for (const r of rows) {
      total += r.value
      const existing = map.get(r.sector)
      if (existing) {
        existing.value += r.value
        existing.rows.push(r)
      } else {
        map.set(r.sector, {
          key: r.sector,
          value: r.value,
          weight: 0,
          color: SECTOR_COLORS[r.sector] ?? SECTOR_COLORS.Other,
          rows: [r]
        })
      }
    }
    const arr = Array.from(map.values())
    for (const s of arr) s.weight = total > 0 ? (s.value / total) * 100 : 0
    arr.sort((a, b) => b.value - a.value)
    return arr
  }, [rows])

  const total = useMemo(() => rows.reduce((acc, r) => acc + r.value, 0), [rows])

  const size = 240
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6
  const rInner = r - 32

  let angle = 0
  const arcs = slices.map((s) => {
    const start = angle
    const sweep = (s.weight / 100) * 360
    const end = angle + sweep
    angle = end
    return { ...s, start, end }
  })

  const hovered = arcs.find((a) => a.key === hover)

  return (
    <section className="card p-4 flex flex-col h-full">
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Allocation</div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <svg width={size} height={size}>
            {arcs.length === 0 && (
              <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#1a2a3a" strokeWidth={1} />
            )}
            {arcs.map((a) => (
              <path
                key={a.key}
                d={arcPath(cx, cy, r, rInner, a.start, a.end)}
                fill={a.color}
                opacity={hover === null || hover === a.key ? 1 : 0.3}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'opacity 200ms', cursor: 'pointer' }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">
              {hovered ? hovered.key : 'Total'}
            </div>
            <Num
              value={hovered ? hovered.value : total}
              prefix="$"
              decimals={0}
              className="text-lg text-text-primary"
            />
            <Num
              value={hovered ? hovered.weight : 100}
              suffix="%"
              decimals={1}
              className="text-[11px] text-text-secondary"
            />
          </div>
        </div>
        <div className="w-full max-h-32 overflow-auto">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {arcs.map((a) => (
              <li
                key={a.key}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
                className="flex items-center gap-1.5 text-[11px] cursor-default"
              >
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: a.color }}
                  aria-hidden
                />
                <span className="text-text-secondary">{a.key}</span>
                <Num value={a.weight} suffix="%" decimals={1} className="text-text-muted" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
