import { Newspaper } from 'lucide-react'
import type { MiniApp } from '../types'
import { WsjTile } from './WsjTile'
import { WsjFullApp } from './WsjFullApp'

export const wsjApp: MiniApp = {
  id: 'wsj',
  label: 'wsj',
  Icon: Newspaper,
  TilePreview: WsjTile,
  FullApp: WsjFullApp
}
