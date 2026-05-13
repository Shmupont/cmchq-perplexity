// Crew — Claude agent orchestration.
// Each agent has a system prompt, a model, and a tool allow-list (local + Anthropic
// server tools). runAgent streams events back to the caller as the agent thinks,
// calls tools, and produces output, then persists the final result to agent_tasks.

import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '../constants'
import { getDb } from './db'
import { getKey } from './keys'
import { LOCAL_TOOL_SCHEMAS, isLocalTool, runLocalTool, type LocalToolName } from './tools'
import type { AgentId, AgentEvent, Task } from '../../shared/agent-types'

export type { AgentId, AgentEvent, Task }

// ---- Agent registry ----

export type AgentDef = {
  id: AgentId
  name: string
  icon: string
  description: string
  systemPrompt: string
  model: string
  localTools: LocalToolName[]
  // Subset of Anthropic native server tools
  serverTools: Array<'web_search' | 'web_fetch'>
}

export const AGENT_DEFS: Record<AgentId, AgentDef> = {
  research: {
    id: 'research',
    name: 'Research',
    icon: '🔍',
    description: 'Research any topic and return a structured summary.',
    systemPrompt: `You are Coleman's research analyst. Given a topic, produce a structured markdown summary that he can scan in 60 seconds. Use web_search and web_fetch to pull real, current information — do not invent facts. Format:

# {Topic}
**TL;DR** — one paragraph
## Key facts
- bullet, bullet, bullet
## What's new
- recent developments with dates
## Why it matters to Coleman
- 2-3 sentences tying it to his world (IB associate, building Mager OS, personal portfolio)
## Sources
- linked citations

Be direct. No fluff.`,
    model: MODELS.SONNET,
    localTools: [],
    serverTools: ['web_search', 'web_fetch']
  },
  analyst: {
    id: 'analyst',
    name: 'Analyst',
    icon: '📊',
    description: 'Analyze a stock, company, or deal.',
    systemPrompt: `You are Coleman's investment analyst. Given a ticker, company, or deal, produce a sharp investment memo. Use get_quote and get_macro for live market data and web_search / web_fetch for filings, news, and context. Format:

# {Subject} — {ticker if applicable}
**Snapshot:** price, day change, market context
## Bull case
- 3-4 points
## Bear case
- 3-4 points
## Key metrics
- pull what's relevant (P/E, growth, leverage, etc.)
## Catalysts to watch
- specific events / dates
## Verdict
- one paragraph: buy / hold / pass and why

Be skeptical. Show your math.`,
    model: MODELS.SONNET,
    localTools: ['get_quote', 'get_macro'],
    serverTools: ['web_search', 'web_fetch']
  },
  writer: {
    id: 'writer',
    name: 'Writer',
    icon: '✍️',
    description: 'Draft emails, memos, or documents with context from your brain.',
    systemPrompt: `You are Coleman's writer. You write in his voice — direct, dry, no corporate fluff, no exclamation points. You have access to brain_search to pull context from his notes (people, projects, prior conversations). Always brain_search before drafting anything addressed to a specific person — you need to know who they are and what's been discussed.

When drafting:
- Match the medium: emails are short, memos are structured, slack is casual
- Open with the point, not pleasantries
- Use his existing terminology (look it up in the brain)
- End with a clear ask or next step

If the brain has no relevant context, say so explicitly — don't fabricate familiarity.`,
    model: MODELS.OPUS,
    localTools: ['brain_search'],
    serverTools: []
  },
  planner: {
    id: 'planner',
    name: 'Planner',
    icon: '📋',
    description: 'Plan your day or week based on emails, follow-ups, and projects.',
    systemPrompt: `You are Coleman's planner. Use get_triage_emails to see what's urgent in his inbox and brain_search to find open follow-ups, project commitments, and TODOs in his notes. Produce a prioritized plan.

Format:
# {Today | This week}
## Must do
- top 3 with the reason each is must-do
## Should do
- next 3-5 with brief context
## Watch
- things to keep an eye on, not yet actionable
## Punt
- things you considered and explicitly deprioritized, with one-line reason

Be ruthless about prioritization. If something has been on the list for a week without movement, call it out.`,
    model: MODELS.SONNET,
    localTools: ['get_triage_emails', 'brain_search'],
    serverTools: []
  },
  monitor: {
    id: 'monitor',
    name: 'Monitor',
    icon: '🕵️',
    description: 'Set up a background watch on a condition.',
    systemPrompt: `You are Coleman's monitor. He'll describe a condition to watch — a price threshold, a news event, a person to track. Your job:
1. Confirm what you understood ("I'll watch X for Y")
2. Check the current state right now using get_quote or web_fetch
3. Report the baseline and state your watch criteria clearly

You run cheap and fast. Be concise. The scheduler runs you periodically — assume each invocation is a single check, not a full conversation.`,
    model: MODELS.HAIKU,
    localTools: ['get_quote'],
    serverTools: ['web_fetch']
  }
}

export function listAgents(): AgentDef[] {
  return Object.values(AGENT_DEFS)
}

export function getAgent(id: AgentId): AgentDef | null {
  return AGENT_DEFS[id] ?? null
}

// ---- Tasks (persistence) ----

export function createTask(agentId: AgentId, description: string): number {
  const db = getDb()
  const agent = AGENT_DEFS[agentId]
  const result = db
    .prepare(
      `INSERT INTO agent_tasks (agent_type, description, status, model, input)
       VALUES (?, ?, 'running', ?, ?)`
    )
    .run(agentId, description, agent?.model ?? 'unknown', JSON.stringify({ description }))
  return Number(result.lastInsertRowid)
}

export function completeTask(
  taskId: number,
  output: string,
  tokensUsed: number,
  status: 'completed' | 'failed'
): void {
  const db = getDb()
  db.prepare(
    `UPDATE agent_tasks
       SET output = ?, tokens_used = ?, status = ?, completed_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(output, tokensUsed, status, taskId)
}

export function getTaskHistory(limit = 50): Task[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT * FROM agent_tasks
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as Task[]
}

export function getTaskResult(taskId: number): Task | null {
  const db = getDb()
  return (
    (db.prepare(`SELECT * FROM agent_tasks WHERE id = ?`).get(taskId) as Task | undefined) ?? null
  )
}

// ---- Tool list builder ----

const SERVER_TOOL_DEFS = {
  web_search: { type: 'web_search_20250305', name: 'web_search', max_uses: 8 },
  web_fetch: { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 8 }
} as const

function buildTools(agent: AgentDef): unknown[] {
  const tools: unknown[] = []
  for (const name of agent.localTools) {
    tools.push(LOCAL_TOOL_SCHEMAS[name])
  }
  for (const name of agent.serverTools) {
    tools.push(SERVER_TOOL_DEFS[name])
  }
  return tools
}

// ---- runAgent: tool-use loop with streaming ----

const MAX_TURNS = 8
const MAX_TOKENS = 4096

export async function runAgent(
  agentId: AgentId,
  description: string,
  emit: (e: AgentEvent) => void,
  onTaskCreated?: (taskId: number) => void
): Promise<{ taskId: number; output: string; tokensUsed: number }> {
  const agent = AGENT_DEFS[agentId]
  if (!agent) {
    const msg = `Unknown agent: ${agentId}`
    emit({ type: 'error', message: msg })
    throw new Error(msg)
  }

  const apiKey = getKey('anthropic')
  if (!apiKey) {
    const msg = 'Anthropic API key not set — open Settings to add it.'
    emit({ type: 'error', message: msg })
    throw new Error(msg)
  }

  const taskId = createTask(agentId, description)
  onTaskCreated?.(taskId)
  const client = new Anthropic({ apiKey })

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    { role: 'user', content: description }
  ]
  const tools = buildTools(agent)

  let collectedText = ''
  let tokensUsed = 0

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const stream = client.messages.stream({
        model: agent.model,
        max_tokens: MAX_TOKENS,
        system: agent.systemPrompt,
        // SDK types are strict; tool_use payloads here are well-formed
        messages: messages as never,
        tools: tools.length > 0 ? (tools as never) : undefined
      })

      stream.on('text', (delta: string) => {
        collectedText += delta
        emit({ type: 'text', delta })
      })

      const finalMessage = await stream.finalMessage()
      tokensUsed +=
        (finalMessage.usage?.input_tokens ?? 0) + (finalMessage.usage?.output_tokens ?? 0)

      // Append the assistant's full reply (with tool_use blocks) to the conversation
      messages.push({ role: 'assistant', content: finalMessage.content })

      if (finalMessage.stop_reason !== 'tool_use') {
        // We're done — no more tool calls requested
        break
      }

      // Find tool_use blocks Claude wants us to execute (client tools only;
      // server tools like web_search resolve inside the API call itself).
      const toolResults: Array<{
        type: 'tool_result'
        tool_use_id: string
        content: string
        is_error?: boolean
      }> = []

      for (const block of finalMessage.content) {
        if (block.type !== 'tool_use') continue
        const name = block.name
        const input = block.input

        if (!isLocalTool(name)) {
          // Server tools should never reach here, but guard anyway
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Unknown tool: ${name}`,
            is_error: true
          })
          continue
        }

        emit({ type: 'tool_use', tool: name, input })
        const result = await runLocalTool(name, input)

        if (result.ok) {
          const json = JSON.stringify(result.data)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: json
          })
          emit({
            type: 'tool_result',
            tool: name,
            ok: true,
            preview: json.length > 200 ? json.slice(0, 200) + '…' : json
          })
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result.error,
            is_error: true
          })
          emit({ type: 'tool_result', tool: name, ok: false, preview: result.error })
        }
      }

      if (toolResults.length === 0) {
        // No client tools to execute (everything must have been server-side); break
        break
      }

      messages.push({ role: 'user', content: toolResults })
    }

    completeTask(taskId, collectedText, tokensUsed, 'completed')
    emit({ type: 'done', output: collectedText, tokens_used: tokensUsed })
    return { taskId, output: collectedText, tokensUsed }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    completeTask(taskId, collectedText || message, tokensUsed, 'failed')
    emit({ type: 'error', message })
    throw e
  }
}
