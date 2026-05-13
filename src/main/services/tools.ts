// Local tool implementations used by Crew agents.
// Anthropic native server tools (web_search, web_fetch) are NOT defined here —
// they're declared in agents.ts as server-tool definitions and Claude runs them
// without round-tripping to this file.
//
// brain_search and get_triage_emails are stubs until Agents 2's data layer
// merges (brain.ts + email.ts). They return empty arrays with a deterministic
// "data source pending" note so agents can run end-to-end today.

import { getQuote, getMacro } from './portfolio'
import type { Quote, MacroChip } from '../../shared/types'

export type BrainChunk = {
  title: string
  path: string
  snippet: string
}

export type TriageEmail = {
  account: string
  from: string
  subject: string
  snippet: string
  importance: number
}

// ---- Tool input shapes ----

type GetQuoteInput = { ticker: string }
type BrainSearchInput = { query: string; limit?: number }

// ---- Tool result shapes ----

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

function ok(data: unknown): ToolResult {
  return { ok: true, data }
}

function err(message: string): ToolResult {
  return { ok: false, error: message }
}

// ---- Implementations ----

async function toolGetQuote(input: GetQuoteInput): Promise<ToolResult> {
  if (!input?.ticker) return err('ticker is required')
  try {
    const q: Quote = await getQuote(input.ticker)
    return ok(q)
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

async function toolGetMacro(): Promise<ToolResult> {
  try {
    const m: MacroChip[] = await getMacro()
    return ok(m)
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

async function toolBrainSearch(input: BrainSearchInput): Promise<ToolResult> {
  // Stub until Agent 2 ships the Brain service.
  if (!input?.query) return err('query is required')
  return ok({
    chunks: [] as BrainChunk[],
    note: 'data source pending — Brain index is built by Agent 2 (the Brain service is not yet merged)'
  })
}

async function toolGetTriageEmails(): Promise<ToolResult> {
  // Stub until Agent 2 ships the Email service.
  return ok({
    emails: [] as TriageEmail[],
    note: 'data source pending — Inbox triage is built by Agent 2 (the Email service is not yet merged)'
  })
}

// ---- Dispatcher ----

export const LOCAL_TOOL_NAMES = [
  'get_quote',
  'get_macro',
  'brain_search',
  'get_triage_emails'
] as const

export type LocalToolName = (typeof LOCAL_TOOL_NAMES)[number]

export function isLocalTool(name: string): name is LocalToolName {
  return (LOCAL_TOOL_NAMES as readonly string[]).includes(name)
}

export async function runLocalTool(name: LocalToolName, input: unknown): Promise<ToolResult> {
  switch (name) {
    case 'get_quote':
      return toolGetQuote((input ?? {}) as GetQuoteInput)
    case 'get_macro':
      return toolGetMacro()
    case 'brain_search':
      return toolBrainSearch((input ?? {}) as BrainSearchInput)
    case 'get_triage_emails':
      return toolGetTriageEmails()
  }
}

// ---- Tool schemas (Anthropic tool definitions for client tools) ----

export const LOCAL_TOOL_SCHEMAS = {
  get_quote: {
    name: 'get_quote',
    description: 'Get a real-time price quote for a single ticker (US stocks, ETFs, ^GSPC, BTC-USD, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker symbol, e.g. "AAPL" or "^GSPC"' }
      },
      required: ['ticker']
    }
  },
  get_macro: {
    name: 'get_macro',
    description: 'Get current macro indicators: S&P 500, NASDAQ, Dow, 10Y yield, VIX, BTC, ETH.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  brain_search: {
    name: 'brain_search',
    description:
      "Search Coleman's Obsidian knowledge graph (notes, contacts, projects, follow-ups) for content related to a query. Returns top matching note chunks.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language search query' },
        limit: { type: 'integer', description: 'Max chunks to return (default 5)' }
      },
      required: ['query']
    }
  },
  get_triage_emails: {
    name: 'get_triage_emails',
    description:
      "Get the top triaged emails across Coleman's 3 Gmail accounts (personal, business, school), AI-ranked by importance.",
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
} as const
