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
        right={<span className="text-[10px] lowercase text-text-muted">today</span>}
      />
      <div className="flex-1 flex flex-col justify-center items-start">
        <div className="text-text-secondary text-sm">nothing today</div>
        <div className="text-text-muted text-[11px] mt-2">next · tomorrow 9:00am</div>
        <div className="text-text-secondary text-[11px]">mark mager — deck review</div>
      </div>
      <div className="text-[10px] lowercase text-text-muted">google calendar</div>
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
