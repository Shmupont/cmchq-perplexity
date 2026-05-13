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
        <Icon size={13} strokeWidth={1.5} className="text-text-secondary" />
        <span className="text-[11px] lowercase tracking-wide text-text-secondary">{label}</span>
      </div>
      {right}
    </div>
  )
}
