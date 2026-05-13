import { Mail } from 'lucide-react'
import type { MiniApp } from './types'
import { TileHeader } from '@components/home/TileHeader'
import { ComingSoon } from '@pages/ComingSoon'

const PLACEHOLDER_EMAILS = [
  { account: 'personal', from: 'Mom', subject: 'sunday dinner' },
  { account: 'business', from: 'Mark Mager', subject: 'updated deck review' },
  { account: 'school', from: 'UCSB Registrar', subject: 'fall enrollment deadline' }
]

function TilePreview(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={Mail}
        label="inbox"
        right={<span className="text-[10px] font-mono text-accent-cyan">3</span>}
      />
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {PLACEHOLDER_EMAILS.map((e) => (
          <div key={e.account} className="text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-text-primary truncate">{e.from}</span>
              <span className="text-[9px] lowercase text-text-muted ml-2 shrink-0">
                {e.account}
              </span>
            </div>
            <div className="text-text-secondary text-[11px] truncate">{e.subject}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] lowercase text-text-muted">gmail × 3</div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <ComingSoon
      name="inbox"
      icon=""
      tagline="Gmail × 3 + AI triage by Claude haiku. Agent 2 builds this."
    />
  )
}

export const inboxApp: MiniApp = {
  id: 'inbox',
  label: 'inbox',
  Icon: Mail,
  TilePreview,
  FullApp,
  badge: () => 3
}
