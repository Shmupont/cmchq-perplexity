// Portfolio service. Reads holdings from DB, quotes via yahoo-finance2,
// caches into price_cache, and builds the renderer-friendly summary.

import YahooFinanceMod from 'yahoo-finance2'
import { getDb } from './db'
import type {
  Holding,
  PortfolioRow,
  PortfolioSummary,
  Quote,
  MacroChip,
  CandlePoint,
  Period
} from '../../shared/types'
import { sectorForTicker } from '../constants'

// yahoo-finance2 v3: CJS needs `new (require().default)()`, ESM needs `new (import).default()`
// electron-vite bundles as CJS, so we handle both shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YFClass = (YahooFinanceMod as any).default ?? YahooFinanceMod
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = typeof YFClass === 'function' ? new YFClass() : YFClass
// Silence first-run notices for cleaner logs
try {
  if (typeof yf.suppressNotices === 'function') yf.suppressNotices(['ripHistorical', 'yahooSurvey'])
  else if (yf._notices?.suppress) yf._notices.suppress(['ripHistorical', 'yahooSurvey'])
} catch {
  /* noop */
}

const CASH_TICKER = 'CASH'

function isCash(h: { ticker: string; asset_type: string | null }): boolean {
  return h.ticker === CASH_TICKER || h.asset_type === 'cash'
}

export function listHoldings(): Holding[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, ticker, shares, cost_basis, description, asset_type, added_at
       FROM holdings ORDER BY ticker ASC`
    )
    .all() as Holding[]
}

export function upsertHolding(input: {
  ticker: string
  shares: number
  cost_basis: number
  description?: string | null
  asset_type?: string | null
}): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO holdings (ticker, shares, cost_basis, description, asset_type)
     VALUES (@ticker, @shares, @cost_basis, @description, @asset_type)
     ON CONFLICT(ticker) DO UPDATE SET
       shares = excluded.shares,
       cost_basis = excluded.cost_basis,
       description = COALESCE(excluded.description, holdings.description),
       asset_type = COALESCE(excluded.asset_type, holdings.asset_type)`
  ).run({
    ticker: input.ticker.toUpperCase(),
    shares: input.shares,
    cost_basis: input.cost_basis,
    description: input.description ?? null,
    asset_type: input.asset_type ?? null
  })
}

export function deleteHolding(ticker: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM holdings WHERE ticker = ?`).run(ticker.toUpperCase())
}

async function quoteOne(ticker: string): Promise<Quote> {
  if (ticker === CASH_TICKER) {
    return {
      ticker,
      price: 1,
      day_change: 0,
      day_change_pct: 0,
      previous_close: 1,
      volume: null,
      market_state: 'CLOSED',
      updated_at: new Date().toISOString()
    }
  }
  try {
    const q = await yf.quote(ticker)
    return {
      ticker,
      price: q?.regularMarketPrice ?? null,
      day_change: q?.regularMarketChange ?? null,
      day_change_pct: q?.regularMarketChangePercent ?? null,
      previous_close: q?.regularMarketPreviousClose ?? null,
      volume: q?.regularMarketVolume ?? null,
      market_state: q?.marketState ?? null,
      updated_at: new Date().toISOString()
    }
  } catch (err) {
    console.error(`[portfolio] quote failed for ${ticker}:`, err)
    return {
      ticker,
      price: null,
      day_change: null,
      day_change_pct: null,
      previous_close: null,
      volume: null,
      market_state: null,
      updated_at: new Date().toISOString()
    }
  }
}

function cacheQuote(q: Quote): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO price_cache (ticker, price, day_change, day_change_pct, volume, previous_close, market_state, updated_at)
     VALUES (@ticker, @price, @day_change, @day_change_pct, @volume, @previous_close, @market_state, @updated_at)
     ON CONFLICT(ticker) DO UPDATE SET
       price = excluded.price,
       day_change = excluded.day_change,
       day_change_pct = excluded.day_change_pct,
       volume = excluded.volume,
       previous_close = excluded.previous_close,
       market_state = excluded.market_state,
       updated_at = excluded.updated_at`
  ).run(q)
}

function readCachedQuote(ticker: string): Quote | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM price_cache WHERE ticker = ?`).get(ticker) as Quote | undefined
}

export async function getPortfolio(): Promise<PortfolioSummary> {
  const holdings = listHoldings()
  const quotes = await Promise.all(holdings.map((h) => quoteOne(h.ticker)))
  quotes.forEach(cacheQuote)
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]))

  let total_value = 0
  let total_cost = 0
  let day_pnl = 0

  const partial: Omit<PortfolioRow, 'weight'>[] = holdings.map((h) => {
    const q = quoteMap.get(h.ticker)
    const cash = isCash(h)
    const price = q?.price ?? (cash ? 1 : 0)
    const day_change = q?.day_change ?? 0
    const day_change_pct = q?.day_change_pct ?? 0
    const value = price * h.shares
    const cost_value = h.cost_basis * h.shares
    const pnl = value - cost_value
    const pnl_pct = cost_value > 0 ? (pnl / cost_value) * 100 : 0
    total_value += value
    total_cost += cost_value
    day_pnl += day_change * h.shares
    return {
      ...h,
      name: h.description || h.ticker,
      sector: sectorForTicker(h.ticker),
      price,
      day_change,
      day_change_pct,
      value,
      cost_value,
      pnl,
      pnl_pct,
      is_cash: cash
    }
  })

  const rows: PortfolioRow[] = partial.map((p) => ({
    ...p,
    weight: total_value > 0 ? (p.value / total_value) * 100 : 0
  }))

  const total_pnl = total_value - total_cost
  const total_pnl_pct = total_cost > 0 ? (total_pnl / total_cost) * 100 : 0
  const prev_value = total_value - day_pnl
  const day_pnl_pct = prev_value > 0 ? (day_pnl / prev_value) * 100 : 0

  return {
    total_value,
    total_cost,
    total_pnl,
    total_pnl_pct,
    day_pnl,
    day_pnl_pct,
    as_of: new Date().toISOString(),
    rows
  }
}

export async function getQuote(ticker: string): Promise<Quote> {
  const fresh = await quoteOne(ticker.toUpperCase())
  if (fresh.price !== null) {
    cacheQuote(fresh)
    return fresh
  }
  return readCachedQuote(ticker.toUpperCase()) ?? fresh
}

const MACRO_TICKERS: { ticker: string; label: string }[] = [
  { ticker: '^GSPC', label: 'S&P 500' },
  { ticker: '^IXIC', label: 'NASDAQ' },
  { ticker: '^DJI', label: 'Dow' },
  { ticker: '^TNX', label: '10Y' },
  { ticker: '^VIX', label: 'VIX' },
  { ticker: 'BTC-USD', label: 'BTC' },
  { ticker: 'ETH-USD', label: 'ETH' }
]

export async function getMacro(): Promise<MacroChip[]> {
  const results = await Promise.all(
    MACRO_TICKERS.map(async ({ ticker, label }) => {
      try {
        const q = await yf.quote(ticker)
        return {
          ticker,
          label,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          change_pct: q?.regularMarketChangePercent ?? null
        }
      } catch (err) {
        console.error(`[portfolio] macro quote failed for ${ticker}:`, err)
        return { ticker, label, price: null, change: null, change_pct: null }
      }
    })
  )
  return results
}

function periodToRange(period: Period): { period1: Date; interval: '1d' | '1h' | '1wk' } {
  const now = new Date()
  switch (period) {
    case '1D': {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return { period1: d, interval: '1h' }
    }
    case '1W': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { period1: d, interval: '1d' }
    }
    case '1M': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return { period1: d, interval: '1d' }
    }
    case '3M': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return { period1: d, interval: '1d' }
    }
    case 'YTD': {
      const d = new Date(now.getFullYear(), 0, 1)
      return { period1: d, interval: '1d' }
    }
    case '1Y':
    default: {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 1)
      return { period1: d, interval: '1wk' }
    }
  }
}

export async function getHistory(ticker: string, period: Period = '1M'): Promise<CandlePoint[]> {
  if (ticker === CASH_TICKER) return []
  const { period1, interval } = periodToRange(period)
  try {
    const res = await yf.chart(ticker, { period1, interval })
    return (res?.quotes ?? [])
      .filter((q) => q.close !== null && q.open !== null)
      .map((q) => ({
        time:
          interval === '1h'
            ? Math.floor(new Date(q.date as unknown as string).getTime() / 1000).toString()
            : (q.date as unknown as Date).toISOString().slice(0, 10),
        open: q.open as number,
        high: q.high as number,
        low: q.low as number,
        close: q.close as number,
        volume: (q.volume as number | undefined) ?? undefined
      }))
  } catch (err) {
    console.error(`[portfolio] chart failed for ${ticker} ${period}:`, err)
    return []
  }
}
