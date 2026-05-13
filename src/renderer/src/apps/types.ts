import type { LucideIcon } from 'lucide-react'
import type { AppId } from '@stores/appStore'

export type GridSpan = {
  colSpan?: number // default 1, max 2
  rowSpan?: number // default 1
}

export type MiniApp = {
  id: AppId
  label: string // lowercase, no emoji
  Icon: LucideIcon
  span?: GridSpan
  TilePreview: React.FC
  FullApp: React.FC
  badge?: () => string | number | null
}
