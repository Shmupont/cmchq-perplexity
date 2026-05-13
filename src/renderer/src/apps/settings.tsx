import { Settings as SettingsIcon } from 'lucide-react'
import type { MiniApp } from './types'
import { Settings } from '@pages/Settings'

// Settings is not on the home grid — accessed via TopBar gear icon.
// Kept in the registry so the same open/close machinery applies.

function TilePreview(): React.JSX.Element {
  return <div />
}

export const settingsApp: MiniApp = {
  id: 'settings',
  label: 'settings',
  Icon: SettingsIcon,
  TilePreview,
  FullApp: Settings
}
