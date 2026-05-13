import { useState } from 'react'
import { useAppStore, type Page } from '@stores/appStore'

type NavItem = {
  id: Page
  label: string
  icon: string
}

const ITEMS: NavItem[] = [
  { id: 'brain', label: 'Brain', icon: '🧠' },
  { id: 'terminal', label: 'Terminal', icon: '📊' },
  { id: 'inbox', label: 'Inbox', icon: '📧' },
  { id: 'crew', label: 'Crew', icon: '🤖' },
  { id: 'briefing', label: 'Briefing', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

export function Sidebar(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const page = useAppStore((s) => s.page)
  const setPage = useAppStore((s) => s.setPage)

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`flex flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out ${
        expanded ? 'w-[200px]' : 'w-[56px]'
      }`}
    >
      <div className="flex-1 flex flex-col gap-1 px-2 py-3 titlebar-no-drag">
        {ITEMS.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`group relative flex items-center gap-3 rounded-md h-10 px-2.5 transition-colors ${
                active
                  ? 'bg-surface-elevated text-text-primary glow-active'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              }`}
            >
              <span className="text-lg leading-none w-6 text-center" aria-hidden>
                {item.icon}
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${
                  expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] bg-accent-cyan rounded-r" />
              )}
            </button>
          )
        })}
      </div>
      <div className="px-3 py-3 border-t border-border">
        <div
          className={`text-[10px] uppercase tracking-wider text-text-muted ${expanded ? '' : 'text-center'}`}
        >
          {expanded ? 'CMC HQ v0.1' : 'v0.1'}
        </div>
      </div>
    </nav>
  )
}
