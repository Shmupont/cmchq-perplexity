// IPC handlers for the Crew (Claude agents).
// runTask streams events to the renderer via webContents.send on EVT.AGENTS_STREAM,
// keyed by taskId so multiple agent runs can stream concurrently.

import { ipcMain } from 'electron'
import { IPC, EVT } from '../constants'
import {
  listAgents,
  runAgent,
  getTaskHistory,
  getTaskResult,
  type AgentDef
} from '../services/agents'
import type {
  AgentId,
  AgentEvent,
  AgentSummary,
  AgentStreamMessage,
  Task
} from '../../shared/agent-types'

export type { AgentSummary, AgentStreamMessage }

function summarize(a: AgentDef): AgentSummary {
  // Renderer doesn't need the system prompt — keep it server-side.
  return {
    id: a.id,
    name: a.name,
    icon: a.icon,
    description: a.description,
    model: a.model,
    localTools: [...a.localTools],
    serverTools: [...a.serverTools]
  }
}

export function registerAgentsIpc(): void {
  ipcMain.handle(IPC.AGENTS_LIST, (): AgentSummary[] => listAgents().map(summarize))

  ipcMain.handle(IPC.AGENTS_TASK_HISTORY, (_e, limit?: number): Task[] =>
    getTaskHistory(limit ?? 50)
  )

  ipcMain.handle(IPC.AGENTS_TASK_RESULT, (_e, taskId: number): Task | null => getTaskResult(taskId))

  ipcMain.handle(
    IPC.AGENTS_RUN,
    async (
      e,
      args: { agentId: AgentId; description: string }
    ): Promise<{ taskId: number; output: string; tokensUsed: number }> => {
      const sender = e.sender
      let taskId: number | null = null

      const emit = (event: AgentEvent): void => {
        if (taskId === null || sender.isDestroyed()) return
        sender.send(EVT.AGENTS_STREAM, { taskId, event } satisfies AgentStreamMessage)
      }

      return runAgent(args.agentId, args.description, emit, (id) => {
        taskId = id
      })
    }
  )
}
