import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC, EVT } from '../main/constants'
import type {
  PortfolioSummary,
  Quote,
  MacroChip,
  Holding,
  CandlePoint,
  Period,
  TriageView,
  EmailRecord,
  EmailDetail,
  EmailFilters,
  EmailAccount,
  EmailAccountLabel,
  EmailSyncStatus
} from '../shared/types'
import type {
  BrainGraph,
  NoteDetail,
  BrainSearchHit,
  VaultStats,
  BrainStatus,
  BrainChatMessage,
  BrainChatModel,
  BrainChatStreamEvent
} from '../shared/brain-types'
import type {
  AgentId,
  AgentSummary,
  AgentStreamMessage,
  Task,
  Briefing,
  BriefType,
  KeyName
} from '../shared/agent-types'
import type { NewsItem, NewsFetchResult } from '../shared/news-types'
import type { JarvisMessage, JarvisRole } from '../shared/jarvis-types'

type Unsubscribe = () => void

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
    getGraph: (force?: boolean): Promise<BrainGraph> =>
      ipcRenderer.invoke(IPC.BRAIN_GRAPH, force),
    getNote: (id: string): Promise<NoteDetail | null> => ipcRenderer.invoke(IPC.BRAIN_NOTE, id),
    search: (query: string, limit?: number): Promise<BrainSearchHit[]> =>
      ipcRenderer.invoke(IPC.BRAIN_SEARCH, query, limit),
    chat: (input: {
      id: string
      messages: BrainChatMessage[]
      model: BrainChatModel
    }): Promise<{ started: true }> => ipcRenderer.invoke(IPC.BRAIN_CHAT, input),
    cancelChat: (id: string): Promise<{ cancelled: true }> =>
      ipcRenderer.invoke(IPC.BRAIN_CHAT_CANCEL, id),
    stats: (): Promise<VaultStats> => ipcRenderer.invoke(IPC.BRAIN_STATS),
    status: (): Promise<BrainStatus> => ipcRenderer.invoke(IPC.BRAIN_STATUS),
    reindex: (): Promise<{ started: true }> => ipcRenderer.invoke(IPC.BRAIN_REINDEX),
    onChatEvent: (cb: (ev: BrainChatStreamEvent) => void): Unsubscribe => {
      const listener = (_: unknown, ev: BrainChatStreamEvent): void => cb(ev)
      ipcRenderer.on(EVT.BRAIN_CHAT_TOKEN, listener)
      return () => ipcRenderer.removeListener(EVT.BRAIN_CHAT_TOKEN, listener)
    },
    onIndexProgress: (cb: (p: { done: number; total: number }) => void): Unsubscribe => {
      const listener = (_: unknown, p: { done: number; total: number }): void => cb(p)
      ipcRenderer.on(EVT.BRAIN_INDEX_PROGRESS, listener)
      return () => ipcRenderer.removeListener(EVT.BRAIN_INDEX_PROGRESS, listener)
    },
    onGraphChanged: (cb: (p: { total: number }) => void): Unsubscribe => {
      const listener = (_: unknown, p: { total: number }): void => cb(p)
      ipcRenderer.on(EVT.BRAIN_GRAPH_CHANGED, listener)
      return () => ipcRenderer.removeListener(EVT.BRAIN_GRAPH_CHANGED, listener)
    }
  },
  email: {
    triage: (): Promise<TriageView> => ipcRenderer.invoke(IPC.EMAIL_TRIAGE),
    list: (filters: EmailFilters): Promise<EmailRecord[]> =>
      ipcRenderer.invoke(IPC.EMAIL_LIST, filters),
    detail: (id: string, accountId: number): Promise<EmailDetail | null> =>
      ipcRenderer.invoke(IPC.EMAIL_DETAIL, id, accountId),
    markRead: (id: string, accountId: number): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.EMAIL_MARK_READ, id, accountId),
    accounts: (): Promise<EmailAccount[]> => ipcRenderer.invoke(IPC.EMAIL_ACCOUNTS),
    addAccount: (
      input:
        | { kind: 'oauth'; label: EmailAccountLabel }
        | { kind: 'token'; email: string; label: EmailAccountLabel; refresh_token: string }
    ): Promise<EmailAccount[]> => ipcRenderer.invoke(IPC.EMAIL_ACCOUNT_ADD, input),
    removeAccount: (id: number): Promise<EmailAccount[]> =>
      ipcRenderer.invoke(IPC.EMAIL_ACCOUNT_REMOVE, id),
    sync: (): Promise<EmailSyncStatus> => ipcRenderer.invoke(IPC.EMAIL_SYNC),
    retriage: (): Promise<{ started: true }> => ipcRenderer.invoke(IPC.EMAIL_RETRIAGE),
    status: (): Promise<EmailSyncStatus> => ipcRenderer.invoke(IPC.EMAIL_STATUS),
    onSyncProgress: (
      cb: (p: { account: string; done: number; total: number }) => void
    ): Unsubscribe => {
      const listener = (
        _: unknown,
        p: { account: string; done: number; total: number }
      ): void => cb(p)
      ipcRenderer.on(EVT.EMAIL_SYNC_PROGRESS, listener)
      return () => ipcRenderer.removeListener(EVT.EMAIL_SYNC_PROGRESS, listener)
    }
  },
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
    onStream: (handler: (msg: AgentStreamMessage) => void): Unsubscribe => {
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
  },
  news: {
    list: (limit?: number): Promise<NewsItem[]> => ipcRenderer.invoke(IPC.NEWS_LIST, limit),
    refresh: (): Promise<NewsFetchResult> => ipcRenderer.invoke(IPC.NEWS_REFRESH),
    brief: (
      id: string
    ): Promise<{ summary: string; played: boolean; reason: string | null }> =>
      ipcRenderer.invoke(IPC.NEWS_BRIEF, id)
  },
  jarvis: {
    history: (limit?: number): Promise<JarvisMessage[]> =>
      ipcRenderer.invoke(IPC.JARVIS_HISTORY, limit),
    append: (role: JarvisRole, content: string): Promise<JarvisMessage> =>
      ipcRenderer.invoke(IPC.JARVIS_SEND, { role, content }),
    status: (): Promise<{ lastMessage: JarvisMessage | null }> =>
      ipcRenderer.invoke(IPC.JARVIS_STATUS)
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
