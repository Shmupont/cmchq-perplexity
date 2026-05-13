// Email service — Gmail × 3 accounts with OAuth2 refresh-token flow,
// incremental sync, and Claude Haiku triage. Refresh tokens are encrypted
// at rest via Electron's safeStorage. No outbound mail without user click.

import { BrowserWindow, safeStorage, shell } from 'electron'
import { google, type gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import Anthropic from '@anthropic-ai/sdk'
import http from 'http'
import { URL } from 'url'
import { getDb } from './db'
import { MODELS, EVT } from '../constants'
import type {
  EmailAccount,
  EmailAccountLabel,
  EmailAccountStatus,
  EmailDetail,
  EmailFilters,
  EmailRecord,
  EmailSyncStatus,
  TriageView
} from '../../shared/types'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
]

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const RECENT_WINDOW_HOURS = 48

let syncTimer: NodeJS.Timeout | null = null
let syncingNow = false
let lastError: string | null = null

// ---------- Key checks ----------

function hasGmailCreds(): boolean {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET)
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}

// ---------- Token encryption ----------

function encryptToken(token: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[email] safeStorage unavailable — storing token unencrypted')
    return Buffer.from(token, 'utf8')
  }
  return safeStorage.encryptString(token)
}

function decryptToken(buf: Buffer): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return buf.toString('utf8')
    return safeStorage.decryptString(buf)
  } catch (err) {
    console.error('[email] decrypt failed:', err)
    return null
  }
}

// ---------- DB helpers ----------

type AccountRow = {
  id: number
  email: string
  label: string
  refresh_token_encrypted: Buffer | null
  last_sync_at: string | null
}

function listAccountRows(): AccountRow[] {
  return getDb()
    .prepare(
      `SELECT id, email, label, refresh_token_encrypted, last_sync_at FROM email_accounts ORDER BY id ASC`
    )
    .all() as AccountRow[]
}

function rowToAccount(row: AccountRow): EmailAccount {
  let status: EmailAccountStatus = 'never_synced'
  if (!row.refresh_token_encrypted) status = 'needs_auth'
  else if (row.last_sync_at) status = 'ok'
  return {
    id: row.id,
    email: row.email,
    label: row.label as EmailAccountLabel,
    last_sync_at: row.last_sync_at,
    status
  }
}

export function listAccounts(): EmailAccount[] {
  return listAccountRows().map(rowToAccount)
}

export function addAccount(input: {
  email: string
  label: EmailAccountLabel
  refresh_token: string
}): EmailAccount[] {
  const db = getDb()
  const enc = encryptToken(input.refresh_token)
  db.prepare(
    `INSERT INTO email_accounts (email, label, refresh_token_encrypted)
     VALUES (@email, @label, @rt)
     ON CONFLICT(email) DO UPDATE SET
       label = excluded.label,
       refresh_token_encrypted = excluded.refresh_token_encrypted`
  ).run({
    email: input.email.toLowerCase(),
    label: input.label,
    rt: enc
  })
  return listAccounts()
}

export function removeAccount(id: number): EmailAccount[] {
  const db = getDb()
  db.transaction(() => {
    db.prepare(`DELETE FROM emails WHERE account_id = ?`).run(id)
    db.prepare(`DELETE FROM email_accounts WHERE id = ?`).run(id)
  })()
  return listAccounts()
}

// ---------- OAuth client + token plumbing ----------

function makeOAuthClient(redirectUri: string): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    redirectUri
  )
}

function getGmailClientForAccount(row: AccountRow): gmail_v1.Gmail | null {
  if (!row.refresh_token_encrypted) return null
  if (!hasGmailCreds()) return null
  const token = decryptToken(row.refresh_token_encrypted)
  if (!token) return null
  // localhost redirect URI is fine here — only used for token refresh, not auth.
  const oAuth = makeOAuthClient('http://127.0.0.1')
  oAuth.setCredentials({ refresh_token: token })
  return google.gmail({ version: 'v1', auth: oAuth })
}

// ---------- In-app OAuth flow ----------

// Opens a system browser to the consent URL, captures the redirect on a
// loopback HTTP server, exchanges code for tokens, returns the refresh token.
export async function runOAuthFlow(): Promise<{ email: string; refresh_token: string }> {
  if (!hasGmailCreds()) {
    throw new Error('GMAIL_CLIENT_ID/SECRET missing in .env')
  }
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', async () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('Failed to bind loopback OAuth server'))
        return
      }
      const redirectUri = `http://127.0.0.1:${addr.port}/oauth/callback`
      const oAuth = makeOAuthClient(redirectUri)
      const authUrl = oAuth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GMAIL_SCOPES
      })

      server.on('request', async (req, res) => {
        try {
          if (!req.url) return
          const u = new URL(req.url, redirectUri)
          if (u.pathname !== '/oauth/callback') {
            res.writeHead(404).end()
            return
          }
          const err = u.searchParams.get('error')
          if (err) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<h2>Auth failed</h2><p>${err}</p>`)
            server.close()
            reject(new Error(err))
            return
          }
          const code = u.searchParams.get('code')
          if (!code) {
            res.writeHead(400).end('Missing code')
            return
          }
          const { tokens } = await oAuth.getToken(code)
          if (!tokens.refresh_token) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(
              '<h2>No refresh token returned</h2><p>Revoke access at myaccount.google.com and retry.</p>'
            )
            server.close()
            reject(new Error('No refresh_token returned — revoke + retry'))
            return
          }
          oAuth.setCredentials(tokens)
          const oauth2 = google.oauth2({ version: 'v2', auth: oAuth })
          const profile = await oauth2.userinfo.get()
          const email = profile.data.email
          if (!email) {
            res.writeHead(400).end('Missing email')
            server.close()
            reject(new Error('Could not read userinfo.email'))
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            `<h2>Connected ${email}</h2><p>You can close this tab. Return to CMC HQ.</p><script>setTimeout(()=>window.close(),800)</script>`
          )
          server.close()
          resolve({ email, refresh_token: tokens.refresh_token })
        } catch (e) {
          server.close()
          reject(e)
        }
      })

      try {
        await shell.openExternal(authUrl)
      } catch (e) {
        server.close()
        reject(e)
      }
    })
    server.on('error', reject)
  })
}

// ---------- Sync ----------

type GmailMsg = gmail_v1.Schema$Message

function parseHeaders(msg: GmailMsg): {
  from_name: string | null
  from_address: string | null
  subject: string | null
  date: string | null
} {
  const headers = msg.payload?.headers ?? []
  const get = (name: string): string | null => {
    const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())
    return h?.value ?? null
  }
  const fromRaw = get('From') ?? ''
  let from_name: string | null = null
  let from_address: string | null = null
  const m = fromRaw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>/)
  if (m) {
    from_name = m[1].trim()
    from_address = m[2].trim()
  } else if (fromRaw.includes('@')) {
    from_address = fromRaw.trim()
  }
  return {
    from_name,
    from_address,
    subject: get('Subject'),
    date: get('Date')
  }
}

function upsertEmail(accountId: number, msg: GmailMsg): void {
  if (!msg.id) return
  const { from_name, from_address, subject, date } = parseHeaders(msg)
  const labelIds = msg.labelIds ?? []
  const is_unread = labelIds.includes('UNREAD') ? 1 : 0
  const is_starred = labelIds.includes('STARRED') ? 1 : 0
  const hasAttachment =
    msg.payload?.parts?.some((p) => Boolean(p.filename && p.filename.length > 0)) ?? false
  const iso = date ? new Date(date).toISOString() : null
  getDb()
    .prepare(
      `INSERT INTO emails (id, account_id, from_address, from_name, subject, snippet, date,
                           is_unread, is_starred, thread_id, has_attachment)
       VALUES (@id, @account_id, @from_address, @from_name, @subject, @snippet, @date,
               @is_unread, @is_starred, @thread_id, @has_attachment)
       ON CONFLICT(id) DO UPDATE SET
         from_address = excluded.from_address,
         from_name = excluded.from_name,
         subject = excluded.subject,
         snippet = excluded.snippet,
         date = excluded.date,
         is_unread = excluded.is_unread,
         is_starred = excluded.is_starred,
         thread_id = excluded.thread_id,
         has_attachment = excluded.has_attachment`
    )
    .run({
      id: msg.id,
      account_id: accountId,
      from_address,
      from_name,
      subject,
      snippet: msg.snippet ?? null,
      date: iso,
      is_unread,
      is_starred,
      thread_id: msg.threadId ?? null,
      has_attachment: hasAttachment ? 1 : 0
    })
}

export async function syncAccount(accountId: number): Promise<number> {
  const row = listAccountRows().find((r) => r.id === accountId)
  if (!row) return 0
  const gmail = getGmailClientForAccount(row)
  if (!gmail) return 0
  const since = Math.floor((Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000) / 1000)
  const query = `(is:unread OR after:${since})`
  let pageToken: string | undefined
  const ids: string[] = []
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken
    })
    for (const m of res.data.messages ?? []) if (m.id) ids.push(m.id)
    pageToken = res.data.nextPageToken ?? undefined
    if (ids.length >= 200) break
  } while (pageToken)

  let done = 0
  for (const id of ids) {
    try {
      const det = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      })
      upsertEmail(accountId, det.data)
    } catch (err) {
      console.error(`[email] message fetch failed ${id}:`, err)
    }
    done++
    if (done % 20 === 0 || done === ids.length) {
      broadcast(EVT.EMAIL_SYNC_PROGRESS, {
        account: row.email,
        done,
        total: ids.length
      })
    }
  }
  getDb()
    .prepare(`UPDATE email_accounts SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(accountId)
  return ids.length
}

// ---------- Triage ----------

let anthropicClient: Anthropic | null = null
function anthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropicClient
}

const TRIAGE_PROMPT = (sender: string, subject: string, snippet: string): string =>
  `Rate this email's importance from 0 (irrelevant) to 1 (urgent / requires response today).
Reply with strict JSON only — no other text — in the form:
{"score": 0.00, "reason": "10 words or fewer"}

Sender: ${sender}
Subject: ${subject}
Preview: ${snippet}`

type TriageResult = { score: number; reason: string }

function parseTriageJson(s: string): TriageResult | null {
  const m = s.match(/\{[\s\S]*?\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0])
    if (typeof j.score === 'number' && typeof j.reason === 'string') {
      return { score: Math.max(0, Math.min(1, j.score)), reason: j.reason.slice(0, 120) }
    }
  } catch {
    return null
  }
  return null
}

async function triageOne(row: {
  id: string
  from_name: string | null
  from_address: string | null
  subject: string | null
  snippet: string | null
}): Promise<TriageResult | null> {
  const sender = row.from_name
    ? `${row.from_name} <${row.from_address ?? ''}>`
    : row.from_address ?? 'unknown'
  const subject = row.subject ?? '(no subject)'
  const snippet = (row.snippet ?? '').slice(0, 600)
  try {
    const res = await anthropic().messages.create({
      model: MODELS.HAIKU,
      max_tokens: 80,
      messages: [{ role: 'user', content: TRIAGE_PROMPT(sender, subject, snippet) }]
    })
    const text = res.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
      .trim()
    return parseTriageJson(text)
  } catch (err) {
    console.error('[email] triage call failed:', err)
    return null
  }
}

export async function triageNewEmails(): Promise<number> {
  if (!hasAnthropicKey()) return 0
  const rows = getDb()
    .prepare(
      `SELECT id, from_name, from_address, subject, snippet
       FROM emails WHERE importance_score IS NULL ORDER BY date DESC LIMIT 60`
    )
    .all() as {
    id: string
    from_name: string | null
    from_address: string | null
    subject: string | null
    snippet: string | null
  }[]
  if (rows.length === 0) return 0
  const update = getDb().prepare(
    `UPDATE emails SET importance_score = ?, importance_reason = ? WHERE id = ?`
  )
  let scored = 0
  for (const r of rows) {
    const t = await triageOne(r)
    if (t) {
      update.run(t.score, t.reason, r.id)
      scored++
    } else {
      // Mark with -1 score so we don't retry forever — UI treats negative as "untriaged"
      update.run(0, 'triage unavailable', r.id)
    }
  }
  return scored
}

export async function retriageAll(): Promise<number> {
  getDb().prepare(`UPDATE emails SET importance_score = NULL, importance_reason = NULL`).run()
  return triageNewEmails()
}

// ---------- Queries ----------

type EmailJoinRow = Omit<EmailRecord, 'is_unread' | 'is_starred' | 'has_attachment'> & {
  is_unread: number
  is_starred: number
  has_attachment: number
}

const SELECT_BASE = `
  SELECT e.id, e.account_id,
         a.email AS account_email, a.label AS account_label,
         e.from_address, e.from_name, e.subject, e.snippet, e.date,
         e.is_unread, e.is_starred, e.importance_score, e.importance_reason,
         e.thread_id, e.has_attachment
  FROM emails e
  JOIN email_accounts a ON a.id = e.account_id`

function normalizeRow(r: EmailJoinRow): EmailRecord {
  return {
    id: r.id,
    account_id: r.account_id,
    account_email: r.account_email,
    account_label: r.account_label,
    from_address: r.from_address,
    from_name: r.from_name,
    subject: r.subject,
    snippet: r.snippet,
    date: r.date,
    is_unread: Boolean(r.is_unread),
    is_starred: Boolean(r.is_starred),
    importance_score: r.importance_score,
    importance_reason: r.importance_reason,
    thread_id: r.thread_id,
    has_attachment: Boolean(r.has_attachment)
  }
}

export function getTriageView(): TriageView {
  const accounts = listAccountRows()
  const stmt = getDb().prepare(`
    ${SELECT_BASE}
    WHERE e.account_id = ? AND e.is_unread = 1
    ORDER BY COALESCE(e.importance_score, 0) DESC, e.date DESC
    LIMIT 3
  `)
  return {
    columns: accounts.map((acc) => ({
      account: rowToAccount(acc),
      emails: (stmt.all(acc.id) as EmailJoinRow[]).map(normalizeRow)
    }))
  }
}

export function getAllEmails(filters: EmailFilters): EmailRecord[] {
  const where: string[] = []
  const params: unknown[] = []
  if (filters.account_id != null) {
    where.push('e.account_id = ?')
    params.push(filters.account_id)
  }
  if (filters.unread != null) {
    where.push('e.is_unread = ?')
    params.push(filters.unread ? 1 : 0)
  }
  if (filters.starred != null) {
    where.push('e.is_starred = ?')
    params.push(filters.starred ? 1 : 0)
  }
  if (filters.search) {
    where.push('(e.subject LIKE ? OR e.from_name LIKE ? OR e.from_address LIKE ? OR e.snippet LIKE ?)')
    const q = `%${filters.search}%`
    params.push(q, q, q, q)
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(500, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)
  const sql = `${SELECT_BASE} ${whereSql} ORDER BY e.date DESC LIMIT ? OFFSET ?`
  const rows = getDb()
    .prepare(sql)
    .all(...params, limit, offset) as EmailJoinRow[]
  return rows.map(normalizeRow)
}

export async function getEmailDetail(
  id: string,
  accountId: number
): Promise<EmailDetail | null> {
  const baseRow = getDb()
    .prepare(`${SELECT_BASE} WHERE e.id = ? AND e.account_id = ?`)
    .get(id, accountId) as EmailJoinRow | undefined
  if (!baseRow) return null
  const base = normalizeRow(baseRow)
  const row = listAccountRows().find((r) => r.id === accountId)
  if (!row) return { ...base, body_html: null, body_text: null }
  const gmail = getGmailClientForAccount(row)
  if (!gmail) return { ...base, body_html: null, body_text: null }
  try {
    const det = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    })
    const { html, text } = extractBody(det.data.payload ?? null)
    return { ...base, body_html: html, body_text: text }
  } catch (err) {
    console.error('[email] body fetch failed:', err)
    return { ...base, body_html: null, body_text: null }
  }
}

function extractBody(
  payload: gmail_v1.Schema$MessagePart | null
): { html: string | null; text: string | null } {
  if (!payload) return { html: null, text: null }
  let html: string | null = null
  let text: string | null = null
  const walk = (p: gmail_v1.Schema$MessagePart): void => {
    const mime = p.mimeType ?? ''
    if (p.body?.data) {
      const decoded = Buffer.from(p.body.data, 'base64url').toString('utf8')
      if (mime === 'text/html' && !html) html = decoded
      else if (mime === 'text/plain' && !text) text = decoded
    }
    for (const sub of p.parts ?? []) walk(sub)
  }
  walk(payload)
  return { html, text }
}

export async function markRead(id: string, accountId: number): Promise<void> {
  const row = listAccountRows().find((r) => r.id === accountId)
  if (!row) return
  getDb().prepare(`UPDATE emails SET is_unread = 0 WHERE id = ?`).run(id)
  const gmail = getGmailClientForAccount(row)
  if (!gmail) return
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: { removeLabelIds: ['UNREAD'] }
    })
  } catch (err) {
    console.error('[email] markRead Gmail update failed:', err)
  }
}

// ---------- Orchestration ----------

export async function syncAndTriageAll(): Promise<EmailSyncStatus> {
  if (syncingNow) return getEmailStatus()
  syncingNow = true
  lastError = null
  try {
    const accs = listAccountRows()
    for (const a of accs) {
      try {
        await syncAccount(a.id)
      } catch (err) {
        console.error(`[email] sync failed for ${a.email}:`, err)
        lastError = err instanceof Error ? err.message : String(err)
      }
    }
    if (accs.length > 0) {
      await triageNewEmails()
    }
  } finally {
    syncingNow = false
  }
  return getEmailStatus()
}

export function getEmailStatus(): EmailSyncStatus {
  return {
    syncing: syncingNow,
    hasAnthropicKey: hasAnthropicKey(),
    hasGmailCreds: hasGmailCreds(),
    accounts: listAccounts(),
    error: lastError
  }
}

export function initEmail(): void {
  // Initial sync (no-op if no accounts), then poll every 5 minutes.
  syncAndTriageAll().catch((err) => console.error('[email] initial sync:', err))
  syncTimer = setInterval(() => {
    syncAndTriageAll().catch((err) => console.error('[email] periodic sync:', err))
  }, SYNC_INTERVAL_MS)
}

export function stopEmailSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
