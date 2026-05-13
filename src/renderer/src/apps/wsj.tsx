import { Newspaper } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

function TilePreview(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Newspaper}
        label="wsj"
        right={
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-negative animate-pulse" />
            <span className="text-[10px] font-mono lowercase text-negative">live</span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="text-xs text-text-primary leading-snug">
          fed minutes signal cautious path; equities tilt lower at open
        </div>
        <div className="text-[10px] lowercase text-text-muted">wsj · 8 min ago</div>
      </div>
      <div className="text-[10px] lowercase text-text-muted">markets · 30s voice brief</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="wsj"
      icon=""
      tagline="Live RSS from WSJ/Bloomberg/Reuters. Claude summaries + 30-second TTS voice briefings."
    />
  )
}

export const wsjApp: MiniApp = {
  id: 'wsj',
  label: 'wsj',
  Icon: Newspaper,
  TilePreview,
  FullApp
}
