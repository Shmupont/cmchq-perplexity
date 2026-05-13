import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../main/constants'
import type {
  PortfolioSummary,
  Quote,
  MacroChip,
  Holding,
  CandlePoint,
  Period
} from '../shared/types'
import type { BrainGraph } from '../shared/brain-types'

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
