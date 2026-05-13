import { Users } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

const AGENTS = [
  { name: 'research', status: 'idle' },
  { name: 'analyst', status: 'idle' },
  { name: 'writer', status: 'running' },
  { name: 'planner', status: 'idle' },
  { name: 'monitor', status: 'done' }
] as const

const DOT: Record<(typeof AGENTS)[number]['status'], string> = {
  idle: 'bg-border-active',
  running: 'bg-accent-cyan animate-pulse',
  done: 'bg-positive'
}

function TilePreview(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Users}
        label="crew"
        right={<span className="text-[10px] font-mono text-text-secondary">1 active</span>}
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {AGENTS.map((a) => (
          <div key={a.name} className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${DOT[a.status]}`} />
            <span className="text-text-secondary">{a.name}</span>
            <span className="text-[10px] lowercase text-text-muted ml-auto">{a.status}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] lowercase text-text-muted">5 agents</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="crew"
      icon=""
      tagline="Five Claude agents — research, analyst, writer, planner, monitor. Agent 3 builds this."
    />
  )
}

export const crewApp: MiniApp = {
  id: 'crew',
  label: 'crew',
  Icon: Users,
  TilePreview,
  FullApp
}
