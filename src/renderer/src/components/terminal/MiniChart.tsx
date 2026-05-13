import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  CandlestickSeries,
  HistogramSeries
} from 'lightweight-charts'
import type { CandlePoint, Period, Quote } from '../../../../shared/types'
import { Num } from '@components/common/Number'

const PERIODS: Period[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y']

type Props = {
  ticker: string
}

export function MiniChart({ ticker }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [period, setPeriod] = useState<Period>('1M')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 240,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace'
      },
      grid: {
        vertLines: { color: 'rgba(26, 42, 58, 0.5)' },
        horzLines: { color: 'rgba(26, 42, 58, 0.5)' }
      },
      timeScale: { borderColor: '#1a2a3a', timeVisible: true },
      rightPriceScale: { borderColor: '#1a2a3a' }
    })
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    })
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: '#1a2a3a'
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    chartRef.current = chart
    candleRef.current = candle
    volRef.current = vol

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([window.api.portfolio.history(ticker, period), window.api.portfolio.quote(ticker)])
      .then(([candles, q]: [CandlePoint[], Quote]) => {
        if (cancelled || !candleRef.current || !volRef.current) return
        const data: CandlestickData[] = candles.map((c) => ({
          time: (period === '1D' ? Number(c.time) : c.time) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }))
        candleRef.current.setData(data)
        volRef.current.setData(
          candles.map((c) => ({
            time: (period === '1D' ? Number(c.time) : c.time) as Time,
            value: c.volume ?? 0,
            color: c.close >= c.open ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
          }))
        )
        chartRef.current?.timeScale().fitContent()
        setQuote(q)
      })
      .catch((err) => console.error('[MiniChart]', err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [ticker, period])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="font-mono text-2xl text-text-primary">{ticker}</div>
        <div className="flex items-baseline gap-3 mt-1">
          <Num value={quote?.price ?? null} prefix="$" decimals={2} className="text-lg" />
          <Num
            value={quote?.day_change ?? null}
            prefix="$"
            signed
            colored
            decimals={2}
            className="text-sm"
          />
          <Num
            value={quote?.day_change_pct ?? null}
            suffix="%"
            signed
            colored
            decimals={2}
            className="text-sm"
          />
        </div>
      </div>
      <div className="flex gap-1 card-flat p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
              period === p
                ? 'bg-surface-elevated text-accent-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 240 }}>
        {loading && (
          <div className="absolute text-[10px] text-text-muted m-2 animate-pulse">loading…</div>
        )}
      </div>
    </div>
  )
}
