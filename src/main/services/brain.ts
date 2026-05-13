// Brain vault parser. Reads .md files recursively from the Obsidian vault,
// parses frontmatter (type/area), extracts [[wikilinks]], and returns a
// {nodes, edges} graph. Read-only — never writes to the vault.
//
// Agent 2 will extend this with embeddings + chunking. For Agent 1's homescreen
// graph, we just need fast topology data.

import { promises as fs } from 'fs'
import { join, relative, basename } from 'path'
import { homedir } from 'os'
import type { BrainGraph, BrainNode, BrainNodeType, BrainEdge } from '../../shared/brain-types'

const DEFAULT_VAULT = '~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/obsidian brain'

const LINK_REGEX = /\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g
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
  return expandHome(process.env.OBSIDIAN_VAULT_PATH || DEFAULT_VAULT)
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue // skip hidden (.obsidian, .trash, etc.)
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      yield full
    }
  }
}

type ParsedNote = {
  id: string
  title: string
  type: BrainNodeType
  area: string | null
  links: string[]
}

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(FRONTMATTER_REGEX)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    // Strip surrounding quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key.toLowerCase()] = val
  }
  return out
}

function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER_REGEX, '')
}

function extractLinks(body: string): string[] {
  const set = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = LINK_REGEX.exec(body)) !== null) {
    const raw = match[1].trim()
    if (raw.length > 0) set.add(raw)
  }
  return Array.from(set)
}

function normalizeType(raw: string | undefined): BrainNodeType {
  if (!raw) return 'note'
  const lower = raw.toLowerCase().trim()
  if ((ALLOWED_TYPES as string[]).includes(lower)) return lower as BrainNodeType
  // Some common synonyms
  if (lower === 'people') return 'person'
  if (lower === 'docs' || lower === 'doc') return 'document'
  if (lower === 'idea' || lower === 'concept') return 'topic'
  return 'note'
}

async function parseNote(absPath: string, vaultRoot: string): Promise<ParsedNote | null> {
  try {
    const raw = await fs.readFile(absPath, 'utf8')
    const fm = parseFrontmatter(raw)
    const body = stripFrontmatter(raw)
    const rel = relative(vaultRoot, absPath).replace(/\\/g, '/').replace(/\.md$/i, '')
    const title = fm.title || basename(absPath, '.md')
    return {
      id: rel,
      title,
      type: normalizeType(fm.type),
      area: fm.area || null,
      links: extractLinks(body)
    }
  } catch (err) {
    console.error(`[brain] parse failed for ${absPath}:`, err)
    return null
  }
}

let cache: { graph: BrainGraph; ts: number } | null = null
const CACHE_MS = 60_000

export async function getBrainGraph(force = false): Promise<BrainGraph> {
  const now = Date.now()
  if (!force && cache && now - cache.ts < CACHE_MS) return cache.graph

  const vaultPath = resolveVaultPath()
  if (!(await exists(vaultPath))) {
    const empty: BrainGraph = {
      nodes: [],
      edges: [],
      vaultPath,
      scannedAt: new Date().toISOString(),
      noteCount: 0,
      hasVault: false
    }
    cache = { graph: empty, ts: now }
    return empty
  }

  const parsed: ParsedNote[] = []
  for await (const file of walk(vaultPath)) {
    const note = await parseNote(file, vaultPath)
    if (note) parsed.push(note)
  }

  // Build lookup: lowercase title and id → canonical id, so [[Some Note]]
  // and [[some-note]] both resolve to the same node when possible.
  const idByKey = new Map<string, string>()
  for (const n of parsed) {
    idByKey.set(n.id.toLowerCase(), n.id)
    idByKey.set(n.title.toLowerCase(), n.id)
    // Also key by basename (last path segment)
    const base = n.id.split('/').pop()!.toLowerCase()
    if (!idByKey.has(base)) idByKey.set(base, n.id)
  }

  const edges: BrainEdge[] = []
  const linkCount = new Map<string, number>()
  for (const n of parsed) {
    for (const link of n.links) {
      const target = idByKey.get(link.toLowerCase())
      if (!target || target === n.id) continue
      edges.push({ source: n.id, target })
      linkCount.set(n.id, (linkCount.get(n.id) ?? 0) + 1)
      linkCount.set(target, (linkCount.get(target) ?? 0) + 1)
    }
  }

  const nodes: BrainNode[] = parsed.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    area: n.area,
    linkCount: linkCount.get(n.id) ?? 0
  }))

  const graph: BrainGraph = {
    nodes,
    edges,
    vaultPath,
    scannedAt: new Date().toISOString(),
    noteCount: nodes.length,
    hasVault: true
  }
  cache = { graph, ts: now }
  console.log(`[brain] graph: ${nodes.length} nodes, ${edges.length} edges from ${vaultPath}`)
  return graph
}
