import { Calendar as CalendarIcon } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

function TilePreview(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={CalendarIcon}
        label="calendar"
        right={
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">today</span>
        }
      />
      <div className="flex-1 flex flex-col justify-center items-start gap-3">
        <div>
          <div className="card-eyebrow mb-1">open block</div>
          <div className="text-text-primary text-sm">nothing today</div>
        </div>
        <div className="w-full pt-3 border-t border-border/60">
          <div className="card-eyebrow-accent mb-1">next up</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-text-secondary">tomorrow</span>
            <span className="font-mono text-[11px] text-accent-cyan">09:00</span>
          </div>
          <div className="text-text-secondary text-[12px] mt-0.5">mark mager — deck review</div>
        </div>
      </div>
      <div className="text-[10px] lowercase tracking-[0.18em] text-text-muted">google calendar</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="calendar"
      icon=""
      tagline="Day + week view from Google Calendar API. Future agent wires this."
    />
  )
}

export const calendarApp: MiniApp = {
  id: 'calendar',
  label: 'calendar',
  Icon: CalendarIcon,
  TilePreview,
  FullApp
}
