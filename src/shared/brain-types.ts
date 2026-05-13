// Brain graph + RAG types shared between main and renderer.

export type BrainNodeType = 'hub' | 'person' | 'project' | 'topic' | 'document' | 'contact' | 'note'

export type BrainNode = {
  id: string // file path relative to vault, without extension
  title: string
  type: BrainNodeType
  area: string | null
  linkCount: number
}

export type BrainEdge = {
  source: string
  target: string
}

export type BrainGraph = {
  nodes: BrainNode[]
  edges: BrainEdge[]
  vaultPath: string
  scannedAt: string
  noteCount: number
  hasVault: boolean
}

export type NoteDetail = {
  id: string
  path: string // absolute path
  title: string
  type: BrainNodeType
  area: string | null
  content: string // body without frontmatter
  frontmatter: Record<string, unknown>
  linksOut: string[]
  modifiedAt: string
}

export type VaultStats = {
  total: number
  byType: Record<BrainNodeType, number>
  recentlyModified: { id: string; title: string; modifiedAt: string }[]
  orphans: string[]
  indexed: number
}

export type BrainSearchHit = {
  id: string
  title: string
  snippet: string
  score: number
}

export type BrainStatus = {
  vaultPath: string
  vaultExists: boolean
  total: number
  indexed: number
  indexing: boolean
  lastIndexedAt: string | null
  hasOpenAIKey: boolean
  hasAnthropicKey: boolean
  error: string | null
}

export type BrainChatRole = 'user' | 'assistant'
export type BrainChatMessage = { role: BrainChatRole; content: string }
export type BrainChatModel = 'opus' | 'sonnet'

export type BrainChatStreamEvent =
  | { id: string; kind: 'token'; token: string }
  | { id: string; kind: 'sources'; sources: BrainSearchHit[] }
  | { id: string; kind: 'done' }
  | { id: string; kind: 'error'; message: string }
