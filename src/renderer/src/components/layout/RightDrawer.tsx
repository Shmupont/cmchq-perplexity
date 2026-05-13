import { X } from 'lucide-react'
import { useAppStore } from '@stores/appStore'
import { MiniChart } from '@components/terminal/MiniChart'

export function RightDrawer(): React.JSX.Element {
  const drawer = useAppStore((s) => s.drawer)
  const close = useAppStore((s) => s.closeDrawer)
  const open = drawer !== null

  return (
    <aside
      className={`fixed top-0 right-0 h-full w-[420px] border-l border-white/[0.06] bg-surface-elevated/85 backdrop-blur-2xl shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.7)] z-30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!open}
    >
      {/* Left-edge accent line — cyan glow when open */}
      <div
        className={`pointer-events-none absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-cyan/60 to-transparent transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="flex items-center justify-between h-11 px-4 border-b border-border/70">
        <div className="text-[10px] uppercase tracking-[0.22em] text-accent-cyan">
          {drawer?.kind === 'chart' ? (
            <span>
              chart <span className="text-text-muted">·</span>{' '}
              <span className="font-mono text-text-primary">{drawer.ticker}</span>
            </span>
          ) : (
            'detail'
          )}
        </div>
        <button
          onClick={close}
          className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-accent-cyan hover:bg-surface transition-all"
          aria-label="Close"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="p-4 h-[calc(100%-44px)] overflow-auto">
        {drawer?.kind === 'chart' && <MiniChart ticker={drawer.ticker} />}
      </div>
    </aside>
  )
}
