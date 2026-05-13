import { useRef } from 'react'
import type { MiniApp } from '../../apps/types'
import { useAppStore } from '@stores/appStore'

type Props = {
  app: MiniApp
  // Animation state from parent — when openApp is set, peers fade out, opened one stays solid.
  state: 'idle' | 'opening' | 'closing'
  isOpening: boolean // true if THIS tile is the opening one
}

export function AppTile({ app, state, isOpening }: Props): React.JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null)
  const open = useAppStore((s) => s.open)
  const peerFading = state !== 'idle' && !isOpening

  function handleClick(): void {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    open(app.id, { top: r.top, left: r.left, width: r.width, height: r.height })
  }

  const colSpan = app.span?.colSpan ?? 1
  const rowSpan = app.span?.rowSpan ?? 1

  return (
    <button
      ref={ref}
      onClick={handleClick}
      data-app-id={app.id}
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow: `span ${rowSpan} / span ${rowSpan}`
      }}
      className={`group relative h-full w-full text-left rounded-xl border border-border bg-surface/60 backdrop-blur-md overflow-hidden transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:border-accent-blue/40 hover:shadow-[0_0_24px_-8px_rgba(59,130,246,0.4)]
        active:scale-[0.985]
        ${peerFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        ${isOpening ? 'opacity-0 pointer-events-none' : ''}
      `}
    >
      <div className="absolute inset-0">
        <app.TilePreview />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-accent-blue/[0.04] via-transparent to-accent-cyan/[0.04]" />
    </button>
  )
}
