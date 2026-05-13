// IPC handlers for the Terminal (portfolio) system.

import { ipcMain } from 'electron'
import {
  getPortfolio,
  getQuote,
  getMacro,
  getHistory,
  listHoldings,
  upsertHolding,
  deleteHolding
} from '../services/portfolio'
import { IPC } from '../constants'
import type { Period } from '../../shared/types'

export function registerPortfolioIpc(): void {
  ipcMain.handle(IPC.PORTFOLIO_GET, () => getPortfolio())
  ipcMain.handle(IPC.PORTFOLIO_QUOTE, (_e, ticker: string) => getQuote(ticker))
  ipcMain.handle(IPC.PORTFOLIO_MACRO, () => getMacro())
  ipcMain.handle(IPC.PORTFOLIO_HISTORY, (_e, ticker: string, period: Period) =>
    getHistory(ticker, period)
  )
  ipcMain.handle(IPC.PORTFOLIO_REFRESH, () => getPortfolio())

  ipcMain.handle(IPC.HOLDINGS_LIST, () => listHoldings())
  ipcMain.handle(
    IPC.HOLDINGS_UPSERT,
    (
      _e,
      input: {
        ticker: string
        shares: number
        cost_basis: number
        description?: string | null
        asset_type?: string | null
      }
    ) => {
      upsertHolding(input)
      return listHoldings()
    }
  )
  ipcMain.handle(IPC.HOLDINGS_DELETE, (_e, ticker: string) => {
    deleteHolding(ticker)
    return listHoldings()
  })
}
