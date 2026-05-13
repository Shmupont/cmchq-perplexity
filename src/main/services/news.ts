// News service: pulls WSJ + Reuters RSS, parses, persists.
// Lightweight regex-based XML extraction — RSS feeds are predictable enough
// that a full XML parser is overkill for the fields we need.

import { createHash } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import cron, { type ScheduledTask } from 'node-cron'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from './db'
import { MODELS } from '../constants'
import type { NewsItem, NewsSource, NewsFetchResult } from '../../shared/news-types'

const execP = promisify(exec)

type FeedSpec = {
  source: NewsSource
  url: string
}

// Reuters legacy RSS is unreliable; we keep both per HOMESCREEN.md and degrade
// gracefully if either 404s.
const FEEDS: FeedSpec[] = [
  { source: 'wsj', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
  { source: 'reuters', url: 'https://www.rss.reuters.com/news/businessNews' }
]

const ITEM_RE = /<item[\s\S]*?<\/item>/gi
const TAG = (tag: string): RegExp =>
  new RegExp(`<${tag}\\b[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i')

function extractTag(block: string, tag: string): string | null {
  const m = block.match(TAG(tag))
  if (!m) return null
  return (m[1] ?? m[2] ?? '').trim() || null
}

function stripHtml(s: string | null): string | null {
  if (!s) return s
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function idFor(source: NewsSource, link: string): string {
  return createHash('sha1').update(`${source}|${link}`).digest('hex').slice(0, 16)
}

function parseRssDate(raw: string | null): string | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

async function fetchFeed(spec: FeedSpec): Promise<NewsItem[]> {
  try {
    const res = await fetch(spec.url, {
      headers: { 'User-Agent': 'cmchq/0.1 (+local)' }
    })
    if (!res.ok) {
      console.warn(`[news] ${spec.source} HTTP ${res.status}`)
      return []
    }
    const xml = await res.text()
    const items: NewsItem[] = []
    const matches = xml.match(ITEM_RE) ?? []
    for (const block of matches) {
      const link = extractTag(block, 'link')
      const title = extractTag(block, 'title')
      if (!link || !title) continue
      items.push({
        id: idFor(spec.source, link),
        source: spec.source,
        title: stripHtml(title) ?? title,
        link,
        description: stripHtml(extractTag(block, 'description')),
        summary: null,
        published_at: parseRssDate(extractTag(block, 'pubDate')),
        fetched_at: new Date().toISOString()
      })
    }
    return items
  } catch (err) {
    console.error(`[news] fetch failed (${spec.source}):`, err)
    return []
  }
}

export async function refreshFeeds(): Promise<NewsFetchResult> {
  const db = getDb()
  const insert = db.prepare(
    `INSERT INTO news_items (id, source, title, link, description, summary, published_at, fetched_at)
     VALUES (@id, @source, @title, @link, @description, @summary, @published_at, @fetched_at)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       published_at = COALESCE(news_items.published_at, excluded.published_at),
       fetched_at = excluded.fetched_at`
  )
  const tx = db.transaction((items: NewsItem[]) => {
    for (const it of items) insert.run(it)
  })

  let fetched = 0
  let added = 0
  for (const spec of FEEDS) {
    const before = (db.prepare(`SELECT COUNT(*) AS n FROM news_items`).get() as { n: number }).n
    const items = await fetchFeed(spec)
    if (items.length > 0) {
      tx(items)
      fetched += items.length
      const after = (db.prepare(`SELECT COUNT(*) AS n FROM news_items`).get() as { n: number }).n
      added += after - before
    }
  }

  const out: NewsFetchResult = {
    fetched,
    added,
    lastFetchedAt: new Date().toISOString()
  }
  console.log(`[news] refresh: ${fetched} fetched, ${added} new`)
  return out
}

export function listFeed(limit = 40): NewsItem[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, source, title, link, description, summary, published_at, fetched_at
       FROM news_items
       ORDER BY COALESCE(published_at, fetched_at) DESC
       LIMIT ?`
    )
    .all(limit) as NewsItem[]
}

export function getNewsItem(id: string): NewsItem | null {
  const db = getDb()
  return (
    (db
      .prepare(
        `SELECT id, source, title, link, description, summary, published_at, fetched_at
         FROM news_items WHERE id = ?`
      )
      .get(id) as NewsItem | undefined) ?? null
  )
}

let anthropic: Anthropic | null = null
function getAnthropic(): Anthropic | null {
  if (anthropic) return anthropic
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  anthropic = new Anthropic({ apiKey: key })
  return anthropic
}

// Generates a 3-sentence summary for the story and persists it. Returns the summary text.
export async function summarize(id: string): Promise<string> {
  const item = getNewsItem(id)
  if (!item) throw new Error(`news item not found: ${id}`)
  if (item.summary) return item.summary

  const client = getAnthropic()
  if (!client) {
    // Fall back to using description if no API key — keeps the UI flow alive.
    const fallback = item.description ?? `${item.title} (set ANTHROPIC_API_KEY for AI briefings.)`
    persistSummary(id, fallback)
    return fallback
  }

  const prompt = `Summarize this news story in exactly 3 sentences for a 30-second voice briefing. No preamble, no headers — just the summary.

TITLE: ${item.title}
SOURCE: ${item.source.toUpperCase()}
PREVIEW: ${item.description ?? '(no preview available)'}
LINK: ${item.link}`

  const resp = await client.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 220,
    messages: [{ role: 'user', content: prompt }]
  })
  const text = resp.content
    .map((c) => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim()
  persistSummary(id, text)
  return text
}

function persistSummary(id: string, summary: string): void {
  getDb().prepare(`UPDATE news_items SET summary = ? WHERE id = ?`).run(summary, id)
}

// macOS-only TTS via `say`. Returns when audio playback finishes (or fails).
export async function speakSummary(text: string): Promise<{ played: boolean; reason?: string }> {
  if (process.platform !== 'darwin') {
    return { played: false, reason: 'TTS only supported on macOS in v0.1 (uses `say`).' }
  }
  // -r 180 = words per minute, voice "Daniel" is calm and authoritative
  try {
    const safe = text.replace(/"/g, "'").slice(0, 1500)
    await execP(`say -v Daniel -r 180 "${safe}"`)
    return { played: true }
  } catch (err) {
    console.error('[news] say failed:', err)
    return { played: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

let task: ScheduledTask | null = null

export function startNewsScheduler(): void {
  if (task) return
  // Fire once at startup, then every 5 minutes.
  refreshFeeds().catch((err) => console.error('[news] initial refresh failed:', err))
  task = cron.schedule(
    '*/5 * * * *',
    () => {
      refreshFeeds().catch((err) => console.error('[news] scheduled refresh failed:', err))
    },
    { name: 'news-refresh' }
  )
  console.log('[news] scheduler registered (every 5 min)')
}

export function stopNewsScheduler(): void {
  if (task) {
    task.stop()
    task = null
  }
}
