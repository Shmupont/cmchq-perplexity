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

// Brain types live in shared/brain-types.ts (set up by Agent 1's foundation).

// ---------- Email ----------

export type EmailAccountLabel = 'personal' | 'business' | 'school'
export type EmailAccountStatus = 'ok' | 'needs_auth' | 'error' | 'never_synced'

export type EmailAccount = {
  id: number
  email: string
  label: EmailAccountLabel
  last_sync_at: string | null
  status: EmailAccountStatus
}

export type EmailRecord = {
  id: string
  account_id: number
  account_email: string
  account_label: EmailAccountLabel
  from_address: string | null
  from_name: string | null
  subject: string | null
  snippet: string | null
  date: string | null
  is_unread: boolean
  is_starred: boolean
  importance_score: number | null
  importance_reason: string | null
  thread_id: string | null
  has_attachment: boolean
}

export type EmailDetail = EmailRecord & {
  body_html: string | null
  body_text: string | null
}

export type TriageView = {
  columns: { account: EmailAccount; emails: EmailRecord[] }[]
}

export type EmailFilters = {
  account_id?: number
  unread?: boolean
  starred?: boolean
  search?: string
  limit?: number
  offset?: number
}

export type EmailSyncStatus = {
  syncing: boolean
  hasAnthropicKey: boolean
  hasGmailCreds: boolean
  accounts: EmailAccount[]
  error: string | null
}
