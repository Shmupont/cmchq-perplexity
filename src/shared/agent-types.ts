// Renderer-safe types for the Crew system. Mirror the shapes defined in
// src/main/services/agents.ts so the renderer can `import type` without
// dragging Node-only dependencies (Anthropic SDK, better-sqlite3) across
// the IPC boundary.

export type AgentId = 'research' | 'analyst' | 'writer' | 'planner' | 'monitor'

export type AgentSummary = {
  id: AgentId
  name: string
  icon: string
  description: string
  model: string
  localTools: string[]
  serverTools: string[]
}

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; ok: boolean; preview: string }
  | { type: 'done'; output: string; tokens_used: number }
  | { type: 'error'; message: string }

export type AgentStreamMessage = { taskId: number; event: AgentEvent }

export type Task = {
  id: number
  agent_type: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: string | null
  output: string | null
  model: string
  tokens_used: number | null
  created_at: string
  completed_at: string | null
}

export type BriefType = 'daily' | 'weekly'

export type Briefing = {
  id: number
  type: BriefType
  content: string
  generated_at: string
}

export type KeyName = 'anthropic' | 'openai'
