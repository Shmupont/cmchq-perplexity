import { useEffect, useRef, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useAppStore } from '@stores/appStore'

function formatClock(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(d)
}

export function TopBar(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())
  const settingsBtn = useRef<HTMLButtonElement | null>(null)
  const open = useAppStore((s) => s.open)
  const openApp = useAppStore((s) => s.openApp)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function openSettings(): void {
    const el = settingsBtn.current
    if (!el) return
    const r = el.getBoundingClientRect()
    open('settings', { top: r.top, left: r.left, width: r.width, height: r.height })
  }

  return (
    <header className="titlebar relative h-11 flex items-center justify-between px-5 border-b border-border bg-surface">
      <div className="flex items-center gap-3 pl-16">
        <span className="text-[13px] font-semibold tracking-[0.15em] text-text-primary lowercase">
          cmc<span className="text-accent-cyan">hq</span>
        </span>
      </div>
      <div className="flex items-center gap-4 titlebar-no-drag">
        <div className="text-[10px] lowercase tracking-wider text-text-muted">
          {formatDate(now)}
        </div>
        <div className="num text-sm text-text-primary">{formatClock(now)}</div>
        <div className="text-[10px] lowercase tracking-wider text-text-muted">pt</div>
        <button
          ref={settingsBtn}
          onClick={openSettings}
          disabled={openApp === 'settings'}
          className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors disabled:opacity-30"
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon size={13} strokeWidth={1.5} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 divider-rgb" />
    </header>
  )
}
