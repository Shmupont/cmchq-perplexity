import { useAppStore } from '@stores/appStore'
import { MiniChart } from '@components/terminal/MiniChart'

export function RightDrawer(): React.JSX.Element {
  const drawer = useAppStore((s) => s.drawer)
  const close = useAppStore((s) => s.closeDrawer)
  const open = drawer !== null

  return (
    <aside
      className={`fixed top-0 right-0 h-full w-[400px] border-l border-border bg-surface-elevated shadow-glow-cyan transform transition-transform duration-200 ease-out z-30 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between h-11 px-4 border-b border-border">
        <div className="text-[11px] uppercase tracking-wider text-text-secondary">
          {drawer?.kind === 'chart' ? `Chart · ${drawer.ticker}` : 'Detail'}
        </div>
        <button
          onClick={close}
          className="text-text-muted hover:text-text-primary text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-surface"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-4 h-[calc(100%-44px)] overflow-auto">
        {drawer?.kind === 'chart' && <MiniChart ticker={drawer.ticker} />}
      </div>
    </aside>
  )
}
