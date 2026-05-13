// Shared types between main and renderer. Re-exported via preload as window.api.

export type Holding = {
  id: number
  ticker: string
  shares: number
  cost_basis: number
  description: string | null
  asset_type: string | null
  added_at: string
}

export type Quote = {
  ticker: string
  price: number | null
  day_change: number | null
  day_change_pct: number | null
  previous_close: number | null
  volume: number | null
  market_state: string | null
  updated_at: string
}

export type PortfolioRow = Holding & {
  name: string
  sector: string
  price: number
  day_change: number
  day_change_pct: number
  value: number
  cost_value: number
  pnl: number
  pnl_pct: number
  weight: number
  is_cash: boolean
}

export type PortfolioSummary = {
  total_value: number
  total_cost: number
  total_pnl: number
  total_pnl_pct: number
  day_pnl: number
  day_pnl_pct: number
  as_of: string
  rows: PortfolioRow[]
}

export type MacroChip = {
  ticker: string
  label: string
  price: number | null
  change: number | null
  change_pct: number | null
}

export type CandlePoint = {
  time: string // YYYY-MM-DD or unix seconds for intraday
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type Period = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'
