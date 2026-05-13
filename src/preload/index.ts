import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC, EVT } from '../main/constants'
import type {
  PortfolioSummary,
  Quote,
  MacroChip,
  Holding,
  CandlePoint,
  Period
} from '../shared/types'
import type { BrainGraph } from '../shared/brain-types'

import type {
  AgentId,
  AgentSummary,
  AgentStreamMessage,
  Task,
  Briefing,
  BriefType,
  KeyName
} from '../shared/agent-types'

const api = {
  portfolio: {
    get: (): Promise<PortfolioSummary> => ipcRenderer.invoke(IPC.PORTFOLIO_GET),
    refresh: (): Promise<PortfolioSummary> => ipcRenderer.invoke(IPC.PORTFOLIO_REFRESH),
    quote: (ticker: string): Promise<Quote> => ipcRenderer.invoke(IPC.PORTFOLIO_QUOTE, ticker),
    macro: (): Promise<MacroChip[]> => ipcRenderer.invoke(IPC.PORTFOLIO_MACRO),
    history: (ticker: string, period: Period): Promise<CandlePoint[]> =>
      ipcRenderer.invoke(IPC.PORTFOLIO_HISTORY, ticker, period)
  },
  holdings: {
    list: (): Promise<Holding[]> => ipcRenderer.invoke(IPC.HOLDINGS_LIST),
    upsert: (input: {
      ticker: string
      shares: number
      cost_basis: number
      description?: string | null
      asset_type?: string | null
    }): Promise<Holding[]> => ipcRenderer.invoke(IPC.HOLDINGS_UPSERT, input),
    remove: (ticker: string): Promise<Holding[]> => ipcRenderer.invoke(IPC.HOLDINGS_DELETE, ticker)
  },
brain: {
    getGraph: (force?: boolean): Promise<BrainGraph> => ipcRenderer.invoke(IPC.BRAIN_GRAPH, force)

agents: {
    list: (): Promise<AgentSummary[]> => ipcRenderer.invoke(IPC.AGENTS_LIST),
    run: (
      agentId: AgentId,
      description: string
    ): Promise<{ taskId: number; output: string; tokensUsed: number }> =>
      ipcRenderer.invoke(IPC.AGENTS_RUN, { agentId, description }),
    taskHistory: (limit?: number): Promise<Task[]> =>
      ipcRenderer.invoke(IPC.AGENTS_TASK_HISTORY, limit),
    taskResult: (taskId: number): Promise<Task | null> =>
      ipcRenderer.invoke(IPC.AGENTS_TASK_RESULT, taskId),
    onStream: (handler: (msg: AgentStreamMessage) => void): (() => void) => {
      const wrapped = (_e: unknown, msg: AgentStreamMessage): void => handler(msg)
      ipcRenderer.on(EVT.AGENTS_STREAM, wrapped)
      return () => ipcRenderer.removeListener(EVT.AGENTS_STREAM, wrapped)
    }
  },
  briefing: {
    latest: (type: BriefType): Promise<Briefing | null> =>
      ipcRenderer.invoke(IPC.BRIEFING_LATEST, type),
    history: (type: BriefType, limit?: number): Promise<Briefing[]> =>
      ipcRenderer.invoke(IPC.BRIEFING_HISTORY, type, limit),
    regenerate: (type: BriefType): Promise<Briefing> =>
      ipcRenderer.invoke(IPC.BRIEFING_REGENERATE, type)
  },
  keys: {
    status: (): Promise<Record<KeyName, boolean>> => ipcRenderer.invoke(IPC.KEYS_STATUS),
    set: (name: KeyName, value: string): Promise<Record<KeyName, boolean>> =>
      ipcRenderer.invoke(IPC.KEYS_SET, name, value),
    clear: (name: KeyName): Promise<Record<KeyName, boolean>> =>
      ipcRenderer.invoke(IPC.KEYS_CLEAR, name)
  }
}

export type CmcApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
