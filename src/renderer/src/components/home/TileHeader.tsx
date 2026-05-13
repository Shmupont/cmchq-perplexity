import type { LucideIcon } from 'lucide-react'

type Props = {
  Icon: LucideIcon
  label: string
  right?: React.ReactNode
}

// Compact icon + label row used at the top of each tile preview.
// Lowercase label per HOMESCREEN.md visual rules.
export function TileHeader({ Icon, label, right }: Props): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon size={12} strokeWidth={1.5} className="text-text-muted" />
        <span className="text-[10px] lowercase tracking-[0.18em] text-text-muted">{label}</span>
      </div>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </div>
  )
}
