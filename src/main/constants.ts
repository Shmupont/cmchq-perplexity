// Shared constants used across services and IPC handlers.
// Centralized so Agents 2 and 3 can import from one place.

export const MODELS = {
  OPUS: 'claude-opus-4-7',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001'
} as const

export const EMBEDDING_MODEL = 'text-embedding-3-small'

// IPC channel namespaces — keep names stable; renderer references via window.api.*
export const IPC = {
  PORTFOLIO_GET: 'portfolio:get',
  PORTFOLIO_QUOTE: 'portfolio:quote',
  PORTFOLIO_MACRO: 'portfolio:macro',
  PORTFOLIO_HISTORY: 'portfolio:history',
  PORTFOLIO_REFRESH: 'portfolio:refresh',
  HOLDINGS_LIST: 'holdings:list',
  HOLDINGS_UPSERT: 'holdings:upsert',
  HOLDINGS_DELETE: 'holdings:delete',

BRAIN_GRAPH: 'brain:graph',
  BRAIN_NOTE: 'brain:note',
  BRAIN_SEARCH: 'brain:search',
  BRAIN_CHAT: 'brain:chat',
  BRAIN_CHAT_CANCEL: 'brain:chat:cancel',
  BRAIN_STATS: 'brain:stats',
  BRAIN_REINDEX: 'brain:reindex',
  BRAIN_STATUS: 'brain:status',

  EMAIL_TRIAGE: 'email:triage',
  EMAIL_LIST: 'email:list',
  EMAIL_DETAIL: 'email:detail',
  EMAIL_MARK_READ: 'email:markRead',
  EMAIL_ACCOUNTS: 'email:accounts',
  EMAIL_ACCOUNT_ADD: 'email:account:add',
  EMAIL_ACCOUNT_REMOVE: 'email:account:remove',
  EMAIL_SYNC: 'email:sync',
  EMAIL_RETRIAGE: 'email:retriage'

// Keys (API keys, encrypted via safeStorage)
  KEYS_STATUS: 'keys:status',
  KEYS_SET: 'keys:set',
  KEYS_CLEAR: 'keys:clear',

  // Crew (Claude agents)
  AGENTS_LIST: 'agents:list',
  AGENTS_RUN: 'agents:run',
  AGENTS_TASK_HISTORY: 'agents:taskHistory',
  AGENTS_TASK_RESULT: 'agents:taskResult',

  // Briefing
  BRIEFING_LATEST: 'briefing:latest',
  BRIEFING_HISTORY: 'briefing:history',
  BRIEFING_REGENERATE: 'briefing:regenerate'
} as const

// Event channels — main → renderer streaming pushes.
export const EVT = {
BRAIN_CHAT_TOKEN: 'brain:chat:token',
  BRAIN_INDEX_PROGRESS: 'brain:index:progress',
  BRAIN_GRAPH_CHANGED: 'brain:graph:changed',
  EMAIL_SYNC_PROGRESS: 'email:sync:progress'

// Crew streaming, payload includes taskId for fan-out
  AGENTS_STREAM: 'agents:stream'
} as const

export const VAULT_DEFAULT_PATH =
  '~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain'

// Sector mapping — used by AllocationDonut. Keep here so Settings page can also use it.
export const SECTOR_BY_TICKER: Record<string, string> = {
  // Cash & bonds
  CASH: 'Cash',
  SHV: 'Bonds',
  // Equity ETFs by sector
  IBB: 'Healthcare',
  XLV: 'Healthcare',
  XLF: 'Financials',
  XLY: 'Consumer Discretionary',
  VDC: 'Consumer Staples',
  VDE: 'Energy',
  VIS: 'Industrials',
  VGT: 'Technology',
  VNQ: 'Real Estate',
  VPU: 'Utilities',
  // Individual equities
  AAPL: 'Technology',
  GOOGL: 'Technology'
}

export const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Healthcare: '#22d3ee',
  Financials: '#a855f7',
  'Consumer Discretionary': '#f59e0b',
  'Consumer Staples': '#84cc16',
  Energy: '#ef4444',
  Industrials: '#64748b',
  'Real Estate': '#ec4899',
  Utilities: '#14b8a6',
  Bonds: '#94a3b8',
  Cash: '#475569',
  Other: '#1a2a3a'
}

export function sectorForTicker(ticker: string): string {
  return SECTOR_BY_TICKER[ticker] ?? 'Other'
}
