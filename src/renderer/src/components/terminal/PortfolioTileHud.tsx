import { useMemo, useState } from 'react'
import { LineChart, Activity, Gauge as GaugeIcon, Shield } from 'lucide-react'
import type { PortfolioSummary, PortfolioRow } from '../../../../shared/types'
import { SECTOR_COLORS } from '../../../../main/constants'
import { Num } from '@components/common/Number'
import { TileHeader } from '@components/home/TileHeader'

type Props = {
  data: PortfolioSummary | null
}

type Slice = {
  key: string
  value: number
  weight: number
  color: string
  rows: PortfolioRow[]
  start: number
  end: number
}

// --- geometry helpers --------------------------------------------------------

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
  // Avoid degenerate full-circle paths (SVG can't draw a 360° arc as one path).
  const sweep = Math.min(Math.max(end - start, 0), 359.999)
  const e = start + sweep
  const [x1, y1] = polarToCartesian(cx, cy, r, e)
  const [x2, y2] = polarToCartesian(cx, cy, r, start)
  const [x3, y3] = polarToCartesian(cx, cy, rInner, start)
  const [x4, y4] = polarToCartesian(cx, cy, rInner, e)
  const largeArc = sweep <= 180 ? 0 : 1
  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${x4} ${y4}`,
    'Z'
  ].join(' ')
}

function arcStroke(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = Math.min(Math.max(end - start, 0), 359.999)
  const e = start + sweep
  const [x1, y1] = polarToCartesian(cx, cy, r, start)
  const [x2, y2] = polarToCartesian(cx, cy, r, e)
  const largeArc = sweep <= 180 ? 0 : 1
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

// --- derived metrics ---------------------------------------------------------

type Metrics = {
  slices: Slice[]
  total: number
  topWeight: number
  topName: string
  concentration: number // HHI 0..1
  liquidity: number // cash + bonds weight, 0..1
  volatility: number // proxy: |day_pnl_pct| / a scale
  movers: { up: number; down: number; flat: number }
  spark: number[] // 24 synthetic but deterministic points derived from rows
  bestRow: PortfolioRow | null
  worstRow: PortfolioRow | null
}

function computeMetrics(summary: PortfolioSummary | null): Metrics | null {
  if (!summary || !summary.rows || summary.rows.length === 0) return null
  const rows = summary.rows

  // ---- slices (by sector) ----
  const map = new Map<string, Slice>()
  let total = 0
  for (const r of rows) {
    total += r.value
    const cur = map.get(r.sector)
    if (cur) {
      cur.value += r.value
      cur.rows.push(r)
    } else {
      map.set(r.sector, {
        key: r.sector,
        value: r.value,
        weight: 0,
        color: SECTOR_COLORS[r.sector] ?? SECTOR_COLORS.Other,
        rows: [r],
        start: 0,
        end: 0
      })
    }
  }
  const slices = Array.from(map.values()).sort((a, b) => b.value - a.value)
  let angle = 0
  for (const s of slices) {
    s.weight = total > 0 ? (s.value / total) * 100 : 0
    const sweep = (s.weight / 100) * 360
    s.start = angle
    s.end = angle + sweep
    angle = s.end
  }

  const topWeight = slices[0]?.weight ?? 0
  const topName = slices[0]?.key ?? '—'

  // Herfindahl–Hirschman style concentration index (normalised 0..1)
  const hhi = slices.reduce((acc, s) => acc + Math.pow(s.weight / 100, 2), 0)

  // Liquidity proxy: cash + bonds share
  const liquidity =
    slices
      .filter((s) => s.key === 'Cash' || s.key === 'Bonds')
      .reduce((acc, s) => acc + s.weight, 0) / 100

  // Volatility proxy from today's % move
  const volProxy = Math.min(1, Math.abs(summary.day_pnl_pct ?? 0) / 3) // saturates at ±3%

  // Movers
  let up = 0
  let down = 0
  let flat = 0
  let bestRow: PortfolioRow | null = null
  let worstRow: PortfolioRow | null = null
  for (const r of rows) {
    if (r.is_cash) continue
    const c = r.day_change_pct ?? 0
    if (c > 0.05) up++
    else if (c < -0.05) down++
    else flat++
    if (!bestRow || (r.day_change_pct ?? 0) > (bestRow.day_change_pct ?? 0)) bestRow = r
    if (!worstRow || (r.day_change_pct ?? 0) < (worstRow.day_change_pct ?? 0)) worstRow = r
  }

  // Deterministic sparkline derived from row contributions so it visually echoes
  // the day's distribution rather than being random noise.
  const spark: number[] = []
  const sortedPct = rows
    .filter((r) => !r.is_cash)
    .map((r) => r.day_change_pct ?? 0)
    .sort((a, b) => a - b)
  const n = Math.max(sortedPct.length, 1)
  // Build a 24-point cumulative-style curve interpolated through sorted moves
  const points = 24
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const idx = t * (n - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(n - 1, lo + 1)
    const frac = idx - lo
    const v = sortedPct[lo] * (1 - frac) + sortedPct[hi] * frac
    // Accumulate so the spark trends toward the actual day P&L sign
    spark.push((spark[i - 1] ?? 0) * 0.7 + v)
  }

  return {
    slices,
    total,
    topWeight,
    topName,
    concentration: hhi,
    liquidity,
    volatility: volProxy,
    movers: { up, down, flat },
    spark,
    bestRow,
    worstRow
  }
}

// --- mini sparkline ----------------------------------------------------------

function Sparkline({
  values,
  positive,
  width = 92,
  height = 22
}: {
  values: number[]
  positive: boolean
  width?: number
  height?: number
}): React.JSX.Element {
  const { d, area } = useMemo(() => {
    if (values.length === 0) return { d: '', area: '' }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const step = width / (values.length - 1)
    const pts = values.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * (height - 2) - 1
      return [x, y] as const
    })
    const line = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ')
    const fill = `${line} L ${width} ${height} L 0 ${height} Z`
    return { d: line, area: fill }
  }, [values, width, height])

  const stroke = positive ? '#22c55e' : '#ef4444'
  const fill = positive ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'

  return (
    <svg width={width} height={height} className="block" aria-hidden>
      <path d={area} fill={fill} />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// --- JARVIS arc gauge --------------------------------------------------------

function ArcGauge({
  value,
  label,
  detail,
  color,
  size = 52
}: {
  value: number // 0..1
  label: string
  detail: string
  color: string
  size?: number
}): React.JSX.Element {
  const v = Math.max(0, Math.min(1, value))
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 5
  // Sweep from -120° to +120° (240° arc)
  const start = -120
  const end = -120 + 240 * v
  const trackPath = arcStroke(cx, cy, r, -120, 120)
  const valuePath = arcStroke(cx, cy, r, start, end)
  const id = `${label}-${color.replace('#', '')}`

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`${label}: ${detail}`}>
      <svg width={size} height={size} className="overflow-visible" aria-hidden>
        <defs>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(26,42,58,0.9)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d={valuePath}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          filter={`url(#glow-${id})`}
          style={{ transition: 'stroke-dasharray 260ms ease-out' }}
        />
        <circle cx={cx} cy={cy} r={1.2} fill={color} />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-[8.5px] uppercase tracking-[0.18em] text-text-muted">{label}</span>
        <span className="text-[11px] font-mono tabular-nums text-text-primary">{detail}</span>
      </div>
    </div>
  )
}

// --- main component ----------------------------------------------------------

export function PortfolioTileHud({ data }: Props): React.JSX.Element {
  const [hover, setHover] = useState<string | null>(null)
  const metrics = useMemo(() => computeMetrics(data), [data])

  const pnl = data?.day_pnl ?? null
  const pnlPct = data?.day_pnl_pct ?? null
  const positive = typeof pnl === 'number' && pnl > 0
  const negative = typeof pnl === 'number' && pnl < 0
  const glowClass = positive ? 'num-glow-pos' : negative ? 'num-glow-neg' : ''

  // wheel geometry — compact for the tile
  const size = 116
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 4
  const rInner = rOuter - 11
  const rTicks = rOuter + 2

  const slices = metrics?.slices ?? []
  const hovered = hover ? (slices.find((s) => s.key === hover) ?? null) : null

  // gauge colors
  const concentrationColor =
    (metrics?.concentration ?? 0) > 0.4
      ? '#ef4444'
      : (metrics?.concentration ?? 0) > 0.25
        ? '#f59e0b'
        : '#22c55e'
  const liquidityColor =
    (metrics?.liquidity ?? 0) > 0.2
      ? '#22d3ee'
      : (metrics?.liquidity ?? 0) > 0.1
        ? '#3b82f6'
        : '#94a3b8'
  const volColor =
    (metrics?.volatility ?? 0) > 0.66
      ? '#ef4444'
      : (metrics?.volatility ?? 0) > 0.33
        ? '#f59e0b'
        : '#22c55e'

  return (
    <div className="relative flex flex-col h-full p-4 overflow-hidden">
      {/* Faint HUD grid behind everything to amplify the Stark feel */}
      <div className="pointer-events-none absolute inset-0 hud-grid opacity-[0.35]" />

      <TileHeader
        Icon={LineChart}
        label="portfolio"
        right={
          <div className="flex items-center gap-1.5">
            <span className="status-dot is-live" />
            <span className="text-[10px] font-mono lowercase text-text-muted">live</span>
          </div>
        }
      />

      {/* Main row: wheel + numbers */}
      <div className="relative mt-2 flex items-center gap-3 min-h-0">
        {/* Allocation wheel */}
        <div
          className="relative shrink-0"
          style={{ width: size, height: size }}
          aria-label="Portfolio allocation by sector"
          role="img"
        >
          <svg
            width={size}
            height={size}
            className="overflow-visible"
            style={{ transform: 'rotate(-2deg)' }}
          >
            <defs>
              <radialGradient id="wheel-inner-glow" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="rgba(34,211,238,0)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.18)" />
              </radialGradient>
              {slices.map((s) => {
                const id = s.key.replace(/\s/g, '')
                return (
                  <filter
                    key={`g-${id}`}
                    id={`tile-glow-${id}`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="2.4" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              })}
            </defs>

            {/* Outer faint ring */}
            <circle
              cx={cx}
              cy={cy}
              r={rOuter + 1}
              fill="none"
              stroke="rgba(34,211,238,0.18)"
              strokeWidth={0.5}
            />
            {/* Tick marks (every 30°) — JARVIS instrument feel */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = i * 30
              const [x1, y1] = polarToCartesian(cx, cy, rTicks, a)
              const [x2, y2] = polarToCartesian(cx, cy, rTicks + 2, a)
              return (
                <line
                  key={`tick-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(148,163,184,0.35)"
                  strokeWidth={0.7}
                />
              )
            })}

            {/* Empty state ring */}
            {slices.length === 0 && (
              <circle
                cx={cx}
                cy={cy}
                r={rInner + (rOuter - rInner) / 2}
                fill="none"
                stroke="rgba(26,42,58,0.9)"
                strokeWidth={rOuter - rInner}
                strokeDasharray="3 5"
              />
            )}

            {/* Slices */}
            {slices.map((s) => {
              const isActive = hover === s.key
              const dim = hover !== null && !isActive
              const id = s.key.replace(/\s/g, '')
              return (
                <path
                  key={s.key}
                  d={arcPath(cx, cy, rOuter, rInner, s.start, s.end)}
                  fill={s.color}
                  stroke="#04080f"
                  strokeWidth={0.6}
                  opacity={dim ? 0.28 : 0.95}
                  filter={isActive ? `url(#tile-glow-${id})` : undefined}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    transition: 'opacity 220ms ease-out',
                    cursor: 'pointer'
                  }}
                />
              )
            })}

            {/* Inner radial glow */}
            <circle cx={cx} cy={cy} r={rInner} fill="url(#wheel-inner-glow)" />
            {/* Inner hairline */}
            <circle
              cx={cx}
              cy={cy}
              r={rInner - 0.5}
              fill="none"
              stroke="rgba(34,211,238,0.25)"
              strokeWidth={0.5}
            />
          </svg>

          {/* Wheel center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[7.5px] uppercase tracking-[0.22em] text-text-muted leading-none">
              {hovered ? hovered.key.slice(0, 12) : 'alloc'}
            </span>
            <Num
              value={hovered ? hovered.weight : metrics ? 100 : null}
              suffix="%"
              decimals={1}
              className="text-[13px] mt-0.5 text-accent-cyan leading-none"
            />
          </div>
        </div>

        {/* Value + P&L */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <Num
            value={data?.total_value ?? null}
            prefix="$"
            decimals={2}
            className={`text-[26px] leading-none tracking-tight text-text-primary ${glowClass}`}
          />
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
            <Num value={pnl} prefix="$" signed colored decimals={2} />
            <span className="text-text-muted">·</span>
            <Num value={pnlPct} suffix="%" signed colored decimals={2} />
          </div>
          {metrics && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] text-text-muted">
              <span className="status-dot" style={{ background: slices[0]?.color ?? '#475569' }} />
              <span className="truncate">
                top · <span className="text-text-secondary normal-case">{metrics.topName}</span>{' '}
                <span className="font-mono text-text-secondary">
                  {metrics.topWeight.toFixed(1)}%
                </span>
              </span>
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <Sparkline values={metrics?.spark ?? [0, 0]} positive={!negative} />
            {metrics && (
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-text-muted">
                <span className="text-positive">{metrics.movers.up}</span>
                <span className="text-text-muted">·</span>
                <span className="text-negative">{metrics.movers.down}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gauges row — risk / liquidity / volatility */}
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        <ArcGauge
          value={metrics?.concentration ?? 0}
          label="risk"
          detail={metrics ? `${Math.round((metrics.concentration || 0) * 100)}` : '—'}
          color={concentrationColor}
          size={44}
        />
        <ArcGauge
          value={metrics?.liquidity ?? 0}
          label="liq"
          detail={metrics ? `${Math.round(metrics.liquidity * 100)}%` : '—'}
          color={liquidityColor}
          size={44}
        />
        <ArcGauge
          value={metrics?.volatility ?? 0}
          label="vol"
          detail={
            metrics && typeof pnlPct === 'number'
              ? `${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
              : '—'
          }
          color={volColor}
          size={44}
        />
      </div>

      {/* Exposure bar — segmented allocation strip */}
      <div className="relative mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8.5px] uppercase tracking-[0.18em] text-text-muted flex items-center gap-1">
            <Shield size={9} strokeWidth={1.5} />
            exposure
          </span>
          <span className="text-[8.5px] uppercase tracking-[0.18em] text-text-muted">
            {slices.length} sectors
          </span>
        </div>
        <div
          className="flex h-1.5 w-full rounded-sm overflow-hidden border border-border/60"
          role="img"
          aria-label="Sector exposure breakdown"
        >
          {slices.length === 0 ? (
            <div className="w-full bg-border/40 skeleton" />
          ) : (
            slices.map((s) => {
              const isActive = hover === s.key
              const dim = hover !== null && !isActive
              return (
                <div
                  key={s.key}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    width: `${s.weight}%`,
                    background: s.color,
                    opacity: dim ? 0.3 : 0.92,
                    boxShadow: isActive ? `0 0 8px ${s.color}` : undefined,
                    transition: 'opacity 200ms ease-out, box-shadow 200ms ease-out'
                  }}
                  title={`${s.key} ${s.weight.toFixed(1)}%`}
                  aria-label={`${s.key} ${s.weight.toFixed(1)}%`}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Bottom strip — best/worst + clock */}
      <div className="relative mt-2 flex items-center justify-between text-[9.5px] lowercase text-text-muted gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {metrics?.bestRow && (
            <span
              className="flex items-center gap-1 truncate"
              title={`${metrics.bestRow.ticker} top mover`}
            >
              <Activity size={9} strokeWidth={1.5} className="text-positive" />
              <span className="font-mono uppercase text-text-secondary">
                {metrics.bestRow.ticker}
              </span>
              <Num
                value={metrics.bestRow.day_change_pct}
                suffix="%"
                signed
                colored
                decimals={2}
                className="text-[10px]"
              />
            </span>
          )}
          {metrics?.worstRow && metrics.worstRow.ticker !== metrics.bestRow?.ticker && (
            <span
              className="flex items-center gap-1 truncate"
              title={`${metrics.worstRow.ticker} worst mover`}
            >
              <GaugeIcon size={9} strokeWidth={1.5} className="text-negative" />
              <span className="font-mono uppercase text-text-secondary">
                {metrics.worstRow.ticker}
              </span>
              <Num
                value={metrics.worstRow.day_change_pct}
                suffix="%"
                signed
                colored
                decimals={2}
                className="text-[10px]"
              />
            </span>
          )}
        </div>
        <span className="font-mono shrink-0">
          {data?.as_of
            ? new Date(data.as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      </div>
    </div>
  )
}
