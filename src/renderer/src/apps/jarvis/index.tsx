import { Sparkles } from 'lucide-react'
import type { MiniApp } from '../types'
import { JarvisTile } from './JarvisTile'
import { JarvisFullApp } from './JarvisFullApp'

export const jarvisApp: MiniApp = {
  id: 'jarvis',
  label: 'jarvis',
  Icon: Sparkles,
  TilePreview: JarvisTile,
  FullApp: JarvisFullApp
}
