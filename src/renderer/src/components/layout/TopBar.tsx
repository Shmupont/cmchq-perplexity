import { useEffect, useState } from 'react'

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
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="titlebar relative h-11 flex items-center justify-between px-5 border-b border-border bg-surface">
      <div className="flex items-center gap-3 pl-16">
        <span className="text-[13px] font-semibold tracking-[0.15em] text-text-primary">
          CMC <span className="text-accent-cyan">HQ</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Command Center</span>
      </div>
      <div className="flex items-center gap-4 titlebar-no-drag">
        <div className="text-[11px] uppercase tracking-wider text-text-muted">
          {formatDate(now)}
        </div>
        <div className="num text-sm text-text-primary">{formatClock(now)}</div>
        <div className="text-[10px] uppercase tracking-wider text-text-muted">PT</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 divider-rgb" />
    </header>
  )
}
