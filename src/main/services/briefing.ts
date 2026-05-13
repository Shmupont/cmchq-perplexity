// Briefing service — generates daily + weekly intelligence briefs that pull
// from every system (portfolio, emails, brain, macro) and persists them to the
// `briefings` table. Cron schedules in scheduler.ts kick these off.
//
// Email + brain data come from Agent 2's services and aren't available yet,
// so we stub those sections with "data source pending" notes. Once Agent 2
// merges, swap the stub helpers for the real services.

import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '../constants'
import { getDb } from './db'
import { getKey } from './keys'
import { getPortfolio, getMacro } from './portfolio'
import type { PortfolioSummary, MacroChip } from '../../shared/types'
import type { BriefType, Briefing } from '../../shared/agent-types'

export type { BriefType, Briefing }

// ---- Data gatherers ----

type Context = {
  portfolio: PortfolioSummary | null
  macro: MacroChip[]
  triageNote: string
  brainNote: string
}

async function gatherContext(): Promise<Context> {
  const [portfolio, macro] = await Promise.all([
    getPortfolio().catch((e: unknown) => {
      console.error('[briefing] portfolio failed:', e)
      return null
    }),
    getMacro().catch((e: unknown) => {
      console.error('[briefing] macro failed:', e)
      return [] as MacroChip[]
    })
  ])
  return {
    portfolio,
    macro,
    triageNote: 'data source pending — Inbox triage is built by Agent 2',
    brainNote: 'data source pending — Brain index is built by Agent 2'
  }
}

function formatPortfolioContext(p: PortfolioSummary | null): string {
  if (!p) return 'Portfolio data unavailable.'
  const movers = [...p.rows]
    .filter((r) => !r.is_cash && Number.isFinite(r.day_change_pct))
    .sort((a, b) => Math.abs(b.day_change_pct) - Math.abs(a.day_change_pct))
    .slice(0, 5)
    .map(
      (r) =>
        `  - ${r.ticker} (${r.name}): $${r.price.toFixed(2)}, ${r.day_change_pct >= 0 ? '+' : ''}${r.day_change_pct.toFixed(2)}% today, weight ${r.weight.toFixed(1)}%`
    )
    .join('\n')
  return [
    `Total value: $${p.total_value.toFixed(2)}`,
    `Total P&L: ${p.total_pnl >= 0 ? '+' : ''}$${p.total_pnl.toFixed(2)} (${p.total_pnl_pct.toFixed(2)}%)`,
    `Day P&L: ${p.day_pnl >= 0 ? '+' : ''}$${p.day_pnl.toFixed(2)} (${p.day_pnl_pct.toFixed(2)}%)`,
    `Top movers today:`,
    movers
  ].join('\n')
}

function formatMacroContext(macro: MacroChip[]): string {
  if (macro.length === 0) return 'Macro data unavailable.'
  return macro
    .map(
      (m) =>
        `  - ${m.label} (${m.ticker}): ${m.price !== null ? m.price.toFixed(2) : 'n/a'} ${
          m.change_pct !== null ? `(${m.change_pct >= 0 ? '+' : ''}${m.change_pct.toFixed(2)}%)` : ''
        }`
    )
    .join('\n')
}

// ---- Prompts ----

const DAILY_SYSTEM = `You are Coleman's morning intelligence brief. You produce a single-page markdown brief he reads at 7:00 AM PT before the trading day starts. Voice: direct, dry, no exclamation points, no corporate fluff. Numbers are monospaced when rendered — use them precisely.

Output exact format:

# Morning Brief — {Month Day, Year}

## Portfolio
- One line per top mover with ticker, % change, and a one-sentence "why" if context suggests one (earnings, sector move, news). If no obvious "why", leave it off.
- Total value and day P&L on its own line.

## Emails
- Top items needing response, one per line, from each account. If the data source is pending, say so.

## Today
- Brain follow-ups, calendar items, open commitments. If empty, say "Clear deck."

## Market
- Macro snapshot in one or two lines.
- One sentence on what to watch today (Fed, CPI, earnings, etc.) if anything is obvious from the macro data.

Keep total length under 350 words. Skip a section if there's truly nothing to say in it — don't pad.`

const WEEKLY_SYSTEM = `You are Coleman's weekly intelligence brief. You produce a single-page markdown brief he reads Sunday at 8:00 PM PT before the week starts. Same voice as the daily brief — direct, dry, no fluff.

Output exact format:

# Weekly Brief — Week of {Month Day, Year}

## Last week
- Portfolio: weekly P&L, biggest winner, biggest loser, one-line narrative.
- Inbox: rough volume + anything that's been sitting unresolved.
- Brain: notable note activity if surfaced.

## This week
- Calendar items, deadlines, follow-ups due.
- Market events worth pre-positioning around.

## What to think about
- One or two paragraphs of editorial — patterns you see in the data, things he should reconsider, decisions that are overdue.

Keep total length under 500 words. Be opinionated in "what to think about" — that's the point of the brief.`

// ---- Generator ----

async function generate(type: BriefType): Promise<string> {
  const apiKey = getKey('anthropic')
  if (!apiKey) {
    throw new Error('Anthropic API key not set — open Settings to add it.')
  }

  const ctx = await gatherContext()
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date())

  const userContext = [
    `Today is ${dateLabel} (Pacific time).`,
    '',
    '## Portfolio',
    formatPortfolioContext(ctx.portfolio),
    '',
    '## Macro',
    formatMacroContext(ctx.macro),
    '',
    '## Emails (triage)',
    ctx.triageNote,
    '',
    '## Brain (follow-ups, TODOs)',
    ctx.brainNote
  ].join('\n')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1500,
    system: type === 'daily' ? DAILY_SYSTEM : WEEKLY_SYSTEM,
    messages: [{ role: 'user', content: userContext }]
  })

  const text = response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('\n')
    .trim()

  return text || '*(brief was empty)*'
}

// ---- Persistence ----

function insertBriefing(type: BriefType, content: string): Briefing {
  const db = getDb()
  const result = db
    .prepare(`INSERT INTO briefings (type, content) VALUES (?, ?)`)
    .run(type, content)
  return getBriefingById(Number(result.lastInsertRowid))!
}

function getBriefingById(id: number): Briefing | null {
  const db = getDb()
  return (
    (db.prepare(`SELECT * FROM briefings WHERE id = ?`).get(id) as Briefing | undefined) ?? null
  )
}

export function getLatestBrief(type: BriefType): Briefing | null {
  const db = getDb()
  return (
    (db
      .prepare(`SELECT * FROM briefings WHERE type = ? ORDER BY id DESC LIMIT 1`)
      .get(type) as Briefing | undefined) ?? null
  )
}

export function getBriefHistory(type: BriefType, limit = 20): Briefing[] {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM briefings WHERE type = ? ORDER BY id DESC LIMIT ?`)
    .all(type, limit) as Briefing[]
}

// ---- Public generators ----

export async function generateDailyBrief(): Promise<Briefing> {
  const content = await generate('daily')
  return insertBriefing('daily', content)
}

export async function generateWeeklyBrief(): Promise<Briefing> {
  const content = await generate('weekly')
  return insertBriefing('weekly', content)
}

export async function regenerateBrief(type: BriefType): Promise<Briefing> {
  return type === 'daily' ? generateDailyBrief() : generateWeeklyBrief()
}
