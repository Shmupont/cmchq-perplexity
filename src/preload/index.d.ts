import { ElectronAPI } from '@electron-toolkit/preload'
import type { CmcApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: CmcApi
  }
}

export {}
