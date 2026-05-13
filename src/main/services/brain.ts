// Brain service — Obsidian vault parser, graph builder, embedding indexer,
// cosine search over chunks, and Claude RAG streaming. Read-only on the vault.
// Persists parsed notes + embeddings into brain_notes for warm-start. The
// renderer hits this via ipc/brain.ts → window.api.brain.*.

import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import { join, relative, basename } from 'path'
import { homedir } from 'os'
import { BrowserWindow } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getDb } from './db'
import { EMBEDDING_MODEL, MODELS, VAULT_DEFAULT_PATH, EVT } from '../constants'
import type {
  BrainGraph,
  BrainNode,
  BrainNodeType,
  BrainEdge,
  NoteDetail,
  VaultStats,
  BrainSearchHit,
  BrainStatus,
  BrainChatMessage,
  BrainChatModel,
  BrainChatStreamEvent
} from '../../shared/brain-types'

const LINK_REGEX = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g
const FRONTMATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/

const ALLOWED_TYPES: BrainNodeType[] = [
  'hub',
  'person',
  'project',
  'topic',
  'document',
  'contact',
  'note'
]

function expandHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p
}

function resolveVaultPath(): string {
  return expandHome(process.env.OBSIDIAN_VAULT_PATH || VAULT_DEFAULT_PATH)
}

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// ---------- In-memory state ----------

type ParsedNote = {
  id: string
  path: string
  title: string
  type: BrainNodeType
  area: string | null
  body: string
  frontmatter: Record<string, unknown>
  rawLinks: string[]
  linksOut: string[]
  modifiedAt: string
}

let notesById = new Map<string, ParsedNote>()
let titleIndex = new Map<string, string>()
let graphCache: { graph: BrainGraph; ts: number } | null = null
let loaded = false
let loadInFlight: Promise<void> | null = null
let indexInFlight: Promise<void> | null = null
let lastIndexedAt: string | null = null
let lastError: string | null = null
let watcher: FSWatcher | null = null

const GRAPH_CACHE_MS = 60_000

// ---------- Frontmatter parser (minimal YAML subset) ----------

function parseFrontmatter(text: string): {
  fm: Record<string, unknown>
  body: string
} {
  const m = text.match(FRONTMATTER_REGEX)
  if (!m) return { fm: {}, body: text }
  const header = m[1]
  const body = text.slice(m[0].length)
  const fm: Record<string, unknown> = {}
  const lines = header.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const colon = line.indexOf(':')
    if (colon <= 0) {
      i++
      continue
    }
    const key = line.slice(0, colon).trim()
    let val = line.slice(colon + 1).trim()
    if (val === '' && i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
      const list: string[] = []
      i++
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        list.push(
          lines[i]
            .replace(/^\s*-\s+/, '')
            .trim()
            .replace(/^["']|["']$/g, '')
        )
        i++
      }
      fm[key] = list
      continue
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else if (val === 'true' || val === 'false') {
      fm[key] = val === 'true'
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      fm[key] = Number(val)
    } else {
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      fm[key] = val
    }
    i++
  }
  return { fm, body }
}

function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER_REGEX, '')
}

function extractLinks(body: string): string[] {
  const set = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = LINK_REGEX.exec(body)) !== null) {
    const raw = m[1].trim()
    if (raw) set.add(raw)
  }
  return Array.from(set)
}

function normalizeType(raw: unknown, idLower: string): BrainNodeType {
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase().trim()
    if ((ALLOWED_TYPES as string[]).includes(lower)) return lower as BrainNodeType
    if (lower === 'people') return 'person'
    if (lower === 'docs' || lower === 'doc') return 'document'
    if (lower === 'idea' || lower === 'concept') return 'topic'
  }
  if (idLower.includes('hubs/')) return 'hub'
  if (idLower.includes('people/') || idLower.includes('contacts/')) return 'person'
  if (idLower.includes('projects/')) return 'project'
  return 'note'
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      yield full
    }
  }
}

async function parseFile(abs: string, root: string): Promise<ParsedNote | null> {
  try {
    const [raw, st] = await Promise.all([fs.readFile(abs, 'utf8'), fs.stat(abs)])
    const { fm } = parseFrontmatter(raw)
    const stripped = stripFrontmatter(raw)
    const rel = relative(root, abs).replace(/\\/g, '/').replace(/\.md$/i, '')
    const idLower = rel.toLowerCase()
    const title =
      typeof fm.title === 'string' && (fm.title as string).trim()
        ? (fm.title as string)
        : basename(abs, '.md')
    return {
      id: rel,
      path: abs,
      title,
      type: normalizeType(fm.type, idLower),
      area: typeof fm.area === 'string' ? (fm.area as string) : null,
      body: stripped,
      frontmatter: fm,
      rawLinks: extractLinks(stripped),
      linksOut: [],
      modifiedAt: st.mtime.toISOString()
    }
  } catch (err) {
    console.error(`[brain] parse failed for ${abs}:`, err)
    return null
  }
}

function resolveLink(target: string): string | null {
  const t = target.trim()
  const lower = t.toLowerCase()
  if (notesById.has(t)) return t
  const byTitle = titleIndex.get(lower)
  if (byTitle) return byTitle
  const last = lower.split('/').pop()
  if (last) {
    const byBase = titleIndex.get(last)
    if (byBase) return byBase
  }
  return null
}

function rebuildResolvedLinks(): void {
  for (const note of notesById.values()) {
    const resolved: string[] = []
    const seen = new Set<string>()
    for (const raw of note.rawLinks) {
      const id = resolveLink(raw)
      if (id && id !== note.id && !seen.has(id)) {
        seen.add(id)
        resolved.push(id)
      }
    }
    note.linksOut = resolved
  }
}

function buildGraphSnapshot(): BrainGraph {
  const vaultPath = resolveVaultPath()
  const hasVault = existsSync(vaultPath)
  const linkCount = new Map<string, number>()
  const edges: BrainEdge[] = []
  const seenEdge = new Set<string>()
  for (const note of notesById.values()) {
    for (const target of note.linksOut) {
      const key = `${note.id}→${target}`
      if (seenEdge.has(key)) continue
      seenEdge.add(key)
      edges.push({ source: note.id, target })
      linkCount.set(note.id, (linkCount.get(note.id) || 0) + 1)
      linkCount.set(target, (linkCount.get(target) || 0) + 1)
    }
  }
  const nodes: BrainNode[] = Array.from(notesById.values()).map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    area: n.area,
    linkCount: linkCount.get(n.id) || 0
  }))
  return {
    nodes,
    edges,
    vaultPath,
    scannedAt: new Date().toISOString(),
    noteCount: nodes.length,
    hasVault
  }
}

// ---------- DB persistence ----------

function persistNote(n: ParsedNote): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO brain_notes (path, title, content, type, area, links_out, indexed_at)
     VALUES (@path, @title, @content, @type, @area, @links_out, CURRENT_TIMESTAMP)
     ON CONFLICT(path) DO UPDATE SET
       title = excluded.title,
       content = excluded.content,
       type = excluded.type,
       area = excluded.area,
       links_out = excluded.links_out`
  ).run({
    path: n.path,
    title: n.title,
    content: n.body,
    type: n.type,
    area: n.area,
    links_out: JSON.stringify(n.linksOut)
  })
}

function deleteNoteByPath(abs: string): void {
  getDb().prepare(`DELETE FROM brain_notes WHERE path = ?`).run(abs)
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}

// ---------- Load (full scan) ----------

async function doLoadVault(): Promise<void> {
  lastError = null
  const root = resolveVaultPath()
  if (!existsSync(root)) {
    lastError = `Vault not found at ${root}`
    notesById = new Map()
    titleIndex = new Map()
    graphCache = null
    return
  }
  const next = new Map<string, ParsedNote>()
  const nextTitle = new Map<string, string>()
  for await (const file of walk(root)) {
    const n = await parseFile(file, root)
    if (!n) continue
    next.set(n.id, n)
    nextTitle.set(n.title.toLowerCase(), n.id)
    nextTitle.set(basename(n.path, '.md').toLowerCase(), n.id)
    nextTitle.set(n.id.toLowerCase(), n.id)
  }
  notesById = next
  titleIndex = nextTitle
  rebuildResolvedLinks()
  graphCache = null
  const db = getDb()
  const tx = db.transaction((arr: ParsedNote[]) => {
    for (const n of arr) persistNote(n)
  })
  tx(Array.from(notesById.values()))
  loaded = true
  broadcast(EVT.BRAIN_GRAPH_CHANGED, { total: notesById.size })
  console.log(`[brain] loaded ${notesById.size} notes from ${root}`)
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return
  if (loadInFlight) return loadInFlight
  loadInFlight = doLoadVault().finally(() => {
    loadInFlight = null
  })
  return loadInFlight
}

// ---------- Public: graph (Agent 1 contract preserved) ----------

export async function getBrainGraph(force = false): Promise<BrainGraph> {
  if (force) {
    loaded = false
    graphCache = null
  }
  await ensureLoaded()
  const now = Date.now()
  if (graphCache && now - graphCache.ts < GRAPH_CACHE_MS) return graphCache.graph
  const snapshot = buildGraphSnapshot()
  graphCache = { graph: snapshot, ts: now }
  return snapshot
}

// ---------- Public: note + search + stats + status ----------

export async function getNote(id: string): Promise<NoteDetail | null> {
  await ensureLoaded()
  const n = notesById.get(id)
  if (!n) return null
  return {
    id: n.id,
    path: n.path,
    title: n.title,
    type: n.type,
    area: n.area,
    content: n.body,
    frontmatter: n.frontmatter,
    linksOut: n.linksOut,
    modifiedAt: n.modifiedAt
  }
}

export async function searchNotes(query: string, limit = 20): Promise<BrainSearchHit[]> {
  await ensureLoaded()
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: BrainSearchHit[] = []
  for (const n of notesById.values()) {
    const titleHit = n.title.toLowerCase().includes(q)
    const bodyIdx = n.body.toLowerCase().indexOf(q)
    if (!titleHit && bodyIdx === -1) continue
    const score = titleHit ? 1 : 0.5 + Math.max(0, 0.5 - bodyIdx / 5000)
    const snippet =
      bodyIdx >= 0
        ? n.body
            .slice(Math.max(0, bodyIdx - 60), bodyIdx + 140)
            .replace(/\s+/g, ' ')
            .trim()
        : n.body.slice(0, 160).replace(/\s+/g, ' ').trim()
    hits.push({ id: n.id, title: n.title, snippet, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function getVaultStats(): Promise<VaultStats> {
  await ensureLoaded()
  const byType: Record<BrainNodeType, number> = {
    hub: 0,
    person: 0,
    project: 0,
    topic: 0,
    document: 0,
    contact: 0,
    note: 0
  }
  for (const n of notesById.values()) byType[n.type] += 1
  const recentlyModified = Array.from(notesById.values())
    .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
    .slice(0, 8)
    .map((n) => ({ id: n.id, title: n.title, modifiedAt: n.modifiedAt }))
  const orphans = Array.from(notesById.values())
    .filter((n) => n.linksOut.length === 0)
    .map((n) => n.id)
    .slice(0, 50)
  return {
    total: notesById.size,
    byType,
    recentlyModified,
    orphans,
    indexed: chunkStore.length > 0 ? notesById.size : 0
  }
}

export function getStatus(): BrainStatus {
  const vaultPath = resolveVaultPath()
  return {
    vaultPath,
    vaultExists: existsSync(vaultPath),
    total: notesById.size,
    indexed: chunkStore.length > 0 ? notesById.size : 0,
    indexing: Boolean(indexInFlight),
    lastIndexedAt,
    hasOpenAIKey: hasOpenAIKey(),
    hasAnthropicKey: hasAnthropicKey(),
    error: lastError
  }
}

// ---------- Embedding indexer ----------

type IndexedChunk = {
  noteId: string
  title: string
  path: string
  heading: string | null
  text: string
  embedding: Float32Array
}

let chunkStore: IndexedChunk[] = []

function chunkBody(body: string, maxChars = 1800): { heading: string | null; text: string }[] {
  const lines = body.split('\n')
  const segments: { heading: string | null; text: string }[] = []
  let buf: string[] = []
  let heading: string | null = null
  const flush = (): void => {
    const t = buf.join('\n').trim()
    if (t) segments.push({ heading, text: t })
    buf = []
  }
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/)
    if (m) {
      flush()
      heading = m[1].trim()
      continue
    }
    buf.push(line)
  }
  flush()
  if (segments.length === 0) {
    const trimmed = body.trim()
    return trimmed ? [{ heading: null, text: trimmed }] : []
  }
  const out: { heading: string | null; text: string }[] = []
  for (const s of segments) {
    if (s.text.length <= maxChars) {
      out.push(s)
    } else {
      for (let i = 0; i < s.text.length; i += maxChars) {
        out.push({ heading: s.heading, text: s.text.slice(i, i + maxChars) })
      }
    }
  }
  return out
}

let openaiClient: OpenAI | null = null
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openaiClient
}

let anthropicClient: Anthropic | null = null
function anthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropicClient
}

async function embed(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return []
  const res = await openai().embeddings.create({ model: EMBEDDING_MODEL, input: texts })
  return res.data.map((d) => Float32Array.from(d.embedding))
}

function float32ToBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

async function indexOneNote(note: ParsedNote): Promise<void> {
  const chunks = chunkBody(note.body)
  if (chunks.length === 0) return
  const inputs = chunks.map(
    (c) => `# ${note.title}${c.heading ? `\n## ${c.heading}` : ''}\n\n${c.text}`
  )
  const BATCH = 32
  const embeddings: Float32Array[] = []
  for (let i = 0; i < inputs.length; i += BATCH) {
    const slice = inputs.slice(i, i + BATCH)
    embeddings.push(...(await embed(slice)))
  }
  chunkStore = chunkStore.filter((c) => c.noteId !== note.id)
  for (let i = 0; i < chunks.length; i++) {
    chunkStore.push({
      noteId: note.id,
      title: note.title,
      path: note.path,
      heading: chunks[i].heading,
      text: chunks[i].text,
      embedding: embeddings[i]
    })
  }
  const dim = embeddings[0]?.length ?? 0
  if (dim > 0) {
    const avg = new Float32Array(dim)
    for (const e of embeddings) for (let i = 0; i < dim; i++) avg[i] += e[i]
    for (let i = 0; i < dim; i++) avg[i] /= embeddings.length
    getDb()
      .prepare(`UPDATE brain_notes SET embedding = ? WHERE path = ?`)
      .run(float32ToBuffer(avg), note.path)
  }
}

async function doReindex(): Promise<void> {
  if (!hasOpenAIKey()) {
    lastError = 'OPENAI_API_KEY not set — cannot generate embeddings'
    return
  }
  lastError = null
  chunkStore = []
  const all = Array.from(notesById.values())
  let done = 0
  for (const note of all) {
    try {
      await indexOneNote(note)
    } catch (err) {
      console.error(`[brain] index failed for ${note.id}:`, err)
    }
    done++
    if (done % 5 === 0 || done === all.length) {
      broadcast(EVT.BRAIN_INDEX_PROGRESS, { done, total: all.length })
    }
  }
  lastIndexedAt = new Date().toISOString()
}

export async function reindexVault(): Promise<void> {
  await ensureLoaded()
  if (indexInFlight) return indexInFlight
  indexInFlight = doReindex().finally(() => {
    indexInFlight = null
  })
  return indexInFlight
}

// ---------- Semantic search ----------

async function topChunks(query: string, k = 10): Promise<IndexedChunk[]> {
  if (chunkStore.length === 0 || !hasOpenAIKey()) return []
  const [qEmb] = await embed([query])
  return chunkStore
    .map((c) => ({ c, score: cosine(qEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.c)
}

export async function brainSearchSemantic(query: string, k = 5): Promise<BrainSearchHit[]> {
  const chunks = await topChunks(query, k)
  return chunks.map((c, i) => ({
    id: c.noteId,
    title: c.title,
    snippet: c.text.slice(0, 240).replace(/\s+/g, ' ').trim(),
    score: 1 - i / Math.max(chunks.length, 1)
  }))
}

// ---------- RAG chat ----------

const SYSTEM_PROMPT = `You are Coleman's second brain.
You have perfect memory of his notes, contacts, projects, and history.
Answer as if you ARE his memory — first person where natural, never "the user".
Be specific: cite the note title or a detail when you draw from one.
If the relevant notes below don't cover a question, say so honestly rather than guessing.`

const activeChats = new Map<string, AbortController>()

export async function brainChat(
  id: string,
  messages: BrainChatMessage[],
  model: BrainChatModel
): Promise<void> {
  const send = (ev: BrainChatStreamEvent): void => broadcast(EVT.BRAIN_CHAT_TOKEN, ev)
  if (!hasAnthropicKey()) {
    send({ id, kind: 'error', message: 'ANTHROPIC_API_KEY not set' })
    return
  }
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user') {
    send({ id, kind: 'error', message: 'Last message must be from user' })
    return
  }

  let sourceHits: BrainSearchHit[] = []
  let contextBlock = ''
  try {
    const chunks = await topChunks(last.content, 10)
    sourceHits = chunks.map((c, idx) => ({
      id: c.noteId,
      title: c.title,
      snippet: c.text.slice(0, 240).replace(/\s+/g, ' ').trim(),
      score: 1 - idx / Math.max(chunks.length, 1)
    }))
    if (chunks.length > 0) {
      contextBlock = chunks
        .map((c, i) => `[${i + 1}] "${c.title}"${c.heading ? ` — ${c.heading}` : ''}\n${c.text}`)
        .join('\n\n')
    }
  } catch (err) {
    console.error('[brain] retrieval failed:', err)
  }
  send({ id, kind: 'sources', sources: sourceHits })

  const modelId = model === 'opus' ? MODELS.OPUS : MODELS.SONNET
  const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }))
  if (contextBlock) {
    apiMessages[apiMessages.length - 1] = {
      role: 'user',
      content: `${last.content}\n\n---\nRelevant notes from my brain:\n\n${contextBlock}`
    }
  }

  const controller = new AbortController()
  activeChats.set(id, controller)
  try {
    const stream = anthropic().messages.stream(
      {
        model: modelId,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: apiMessages
      },
      { signal: controller.signal }
    )
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        send({ id, kind: 'token', token: ev.delta.text })
      }
    }
    send({ id, kind: 'done' })
  } catch (err) {
    if (controller.signal.aborted) {
      send({ id, kind: 'done' })
    } else {
      send({ id, kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  } finally {
    activeChats.delete(id)
  }
}

export function cancelBrainChat(id: string): void {
  const c = activeChats.get(id)
  if (c) c.abort()
}

// ---------- File watcher ----------

export function startVaultWatcher(): void {
  const root = resolveVaultPath()
  if (!existsSync(root)) return
  if (watcher) return
  watcher = chokidar.watch(root, {
    ignored: [/(^|[/\\])\../],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400 }
  })
  const onChange = async (abs: string, kind: 'add' | 'change' | 'unlink'): Promise<void> => {
    if (!abs.toLowerCase().endsWith('.md')) return
    if (kind === 'unlink') {
      const id = relative(root, abs).replace(/\\/g, '/').replace(/\.md$/i, '')
      notesById.delete(id)
      deleteNoteByPath(abs)
      chunkStore = chunkStore.filter((c) => c.path !== abs)
    } else {
      const n = await parseFile(abs, root)
      if (n) {
        notesById.set(n.id, n)
        titleIndex.set(n.title.toLowerCase(), n.id)
        titleIndex.set(basename(n.path, '.md').toLowerCase(), n.id)
        titleIndex.set(n.id.toLowerCase(), n.id)
        persistNote(n)
        if (hasOpenAIKey()) {
          try {
            await indexOneNote(n)
          } catch (err) {
            console.error(`[brain] re-index on change failed for ${n.id}:`, err)
          }
        }
      }
    }
    rebuildResolvedLinks()
    graphCache = null
    broadcast(EVT.BRAIN_GRAPH_CHANGED, { total: notesById.size })
  }
  watcher
    .on('add', (p) => onChange(p, 'add'))
    .on('change', (p) => onChange(p, 'change'))
    .on('unlink', (p) => onChange(p, 'unlink'))
}

export function stopVaultWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

// Called once from main/index.ts after DB is ready. Kicks off the initial scan
// asynchronously so app startup isn't blocked.
export function initBrain(): void {
  ensureLoaded()
    .then(() => {
      startVaultWatcher()
      if (hasOpenAIKey()) {
        reindexVault().catch((err) => console.error('[brain] initial index failed:', err))
      }
    })
    .catch((err) => console.error('[brain] init failed:', err))
}
