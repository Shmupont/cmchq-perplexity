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
    <header className="titlebar relative h-11 flex items-center justify-between px-5 border-b border-border/70 bg-surface/70 backdrop-blur-xl z-10">
      <div className="flex items-center gap-3 pl-16">
        <span className="relative text-[12px] font-semibold tracking-[0.32em] uppercase">
          <span className="text-text-primary">cmc</span>
          <span className="text-accent-cyan">hq</span>
          <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/70 to-transparent opacity-70" />
        </span>
        <span className="hidden md:inline text-[10px] uppercase tracking-[0.22em] text-text-muted">
          command center
        </span>
      </div>
      <div className="flex items-center gap-4 titlebar-no-drag">
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="status-dot is-live" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">online</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          {formatDate(now)}
        </div>
        <div className="num text-[13px] text-text-primary tracking-wider">{formatClock(now)}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">pt</div>
        <button
          ref={settingsBtn}
          onClick={openSettings}
          disabled={openApp === 'settings'}
          className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-accent-cyan hover:bg-surface-elevated/70 transition-all disabled:opacity-30"
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
