import { Sparkles } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

function TilePreview(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Sparkles}
        label="jarvis"
        right={
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-positive shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse" />
            <span className="text-[10px] lowercase text-text-secondary">online</span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-2 text-xs">
        <div className="text-text-secondary">
          <span className="text-text-muted">you · </span>
          what&apos;s my day looking like?
        </div>
        <div className="text-text-primary">
          <span className="text-accent-cyan">jarvis · </span>
          quiet morning. mark replied about the deck
          <span className="inline-block w-1 h-3 ml-0.5 align-middle bg-accent-cyan animate-pulse" />
        </div>
      </div>
      <div className="text-[10px] lowercase text-text-muted">openclaw tui</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="jarvis"
      icon=""
      tagline="OpenClaw TUI — direct chat with Jarvis. WebSocket ws://127.0.0.1:18789. Streams markdown."
    />
  )
}

export const jarvisApp: MiniApp = {
  id: 'jarvis',
  label: 'jarvis',
  Icon: Sparkles,
  TilePreview,
  FullApp
}
