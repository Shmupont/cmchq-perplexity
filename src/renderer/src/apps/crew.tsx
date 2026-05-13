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

const DOT_CLASS: Record<(typeof AGENTS)[number]['status'], string> = {
  idle: 'status-dot is-offline',
  running: 'status-dot is-running',
  done: 'status-dot is-live'
}

function TilePreview(): React.JSX.Element {
  const activeCount = AGENTS.filter((a) => a.status === 'running').length
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Users}
        label="crew"
        right={
          <span className="text-[10px] font-mono text-accent-cyan">
            {activeCount} <span className="text-text-muted lowercase">active</span>
          </span>
        }
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {AGENTS.map((a) => (
          <div key={a.name} className="flex items-center gap-2 text-xs">
            <span className={DOT_CLASS[a.status]} />
            <span className="text-text-secondary lowercase">{a.name}</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted ml-auto">
              {a.status}
            </span>
          </div>
        ))}
      </div>
      <div className="text-[10px] lowercase tracking-[0.18em] text-text-muted">
        {AGENTS.length} agents
      </div>
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
