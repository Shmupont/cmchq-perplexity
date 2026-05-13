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
    <section className="flex flex-col min-h-0 rounded-md border border-border bg-surface/40">
      <header className="px-3 py-2.5 border-b border-border">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {account.label}
          </span>
          <span className="text-[10px] text-text-muted font-mono">{emails.length}</span>
        </div>
        <div className="text-xs text-text-secondary truncate font-mono">{account.email}</div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2">
        {emails.length === 0 && (
          <div className="text-center text-[11px] text-text-muted py-8">inbox zero</div>
        )}
        {emails.map((e) => (
          <EmailCard key={e.id} email={e} onSelect={onSelect} active={selectedId === e.id} />
        ))}
      </div>
    </section>
  )
}
