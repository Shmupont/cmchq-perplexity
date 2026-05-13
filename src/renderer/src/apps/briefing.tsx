import { FileText } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

const PLACEHOLDER_HEADLINES = [
  'tech tape mixed pre-bell',
  'mark mager waiting on signed deck',
  'no calendar today — open block until 3'
]

function TilePreview(): React.JSX.Element {
  const today = new Date()
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(today)
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={FileText}
        label="briefing"
        right={<span className="text-[10px] font-mono text-text-muted">{date} · 7:00am</span>}
      />
      <ul className="flex-1 flex flex-col justify-center gap-1.5 text-xs text-text-secondary">
        {PLACEHOLDER_HEADLINES.map((h, i) => (
          <li key={i} className="flex gap-2 leading-snug">
            <span className="text-text-muted">·</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <div className="text-[10px] lowercase text-text-muted">morning brief</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="briefing"
      icon=""
      tagline="Daily + weekly briefings auto-generated from portfolio, emails, brain, macro. Agent 3 builds this."
    />
  )
}

export const briefingApp: MiniApp = {
  id: 'briefing',
  label: 'briefing',
  Icon: FileText,
  TilePreview,
  FullApp
}
