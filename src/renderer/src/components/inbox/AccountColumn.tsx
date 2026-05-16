// One triage column: account label + unread count + 3 EmailCards.

import { EmailCard } from './EmailCard'
import type { EmailAccount, EmailRecord } from '../../../../shared/types'

type Props = {
  account: EmailAccount
  emails: EmailRecord[]
  selectedId?: string | null
  onSelect: (e: EmailRecord) => void
}

export function AccountColumn({ account, emails, selectedId, onSelect }: Props): React.JSX.Element {
  return (
    <section className="flex flex-col min-h-0 glass">
      <header className="px-3.5 py-3 border-b border-border/70">
        <div className="flex items-baseline justify-between">
          <span className="card-eyebrow-accent">{account.label}</span>
          <span className="text-[10px] font-mono text-text-secondary">
            {emails.length} <span className="text-text-muted">unread</span>
          </span>
        </div>
        <div className="text-xs text-text-secondary truncate font-mono mt-0.5">{account.email}</div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto p-2.5 space-y-2">
        {emails.length === 0 && (
          <div className="text-center py-10">
            <div className="card-eyebrow mb-2">inbox zero</div>
            <div className="text-[11px] text-text-secondary">nothing urgent</div>
          </div>
        )}
        {emails.map((e) => (
          <EmailCard key={e.id} email={e} onSelect={onSelect} active={selectedId === e.id} />
        ))}
      </div>
    </section>
  )
}
