// 3-column triage view: top 3 most-important unread per account.

import { AccountColumn } from './AccountColumn'
import type { EmailRecord, TriageView as Triage } from '../../../../shared/types'

type Props = {
  data: Triage
  selectedId?: string | null
  onSelect: (e: EmailRecord) => void
}

export function TriageView({ data, selectedId, onSelect }: Props): React.JSX.Element {
  if (data.columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          no accounts connected
        </div>
        <p className="text-sm text-text-secondary mt-3 max-w-md">
          Add a Gmail account in Settings — once authed, the top 3 urgent emails per inbox will
          appear here, scored by Claude haiku.
        </p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3 p-3 h-full min-h-0">
      {data.columns.map((c) => (
        <AccountColumn
          key={c.account.id}
          account={c.account}
          emails={c.emails}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
