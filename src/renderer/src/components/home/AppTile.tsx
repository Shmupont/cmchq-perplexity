import { useRef, useState } from 'react'
import type { MiniApp } from '../../apps/types'
import { useAppStore } from '@stores/appStore'

type Props = {
  app: MiniApp
  // Animation state from parent — when openApp is set, peers fade out, the opened one stays solid.
  state: 'idle' | 'opening' | 'closing'
  isOpening: boolean // true if THIS tile is the opening one
  index: number
}

// Glass tile with cursor-tracked highlight + soft cyan border on hover.
// Click → scales down slightly, then parent animates a fullscreen expansion.
export function AppTile({ app, state, isOpening, index }: Props): React.JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null)
  const open = useAppStore((s) => s.open)
  const peerFading = state !== 'idle' && !isOpening
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  function handleClick(): void {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    open(app.id, { top: r.top, left: r.left, width: r.width, height: r.height })
  }

  function handleMove(e: React.MouseEvent<HTMLButtonElement>): void {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const colSpan = app.span?.colSpan ?? 1
  const rowSpan = app.span?.rowSpan ?? 1

  return (
    <button
      ref={ref}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      data-app-id={app.id}
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
        animationDelay: `${Math.min(index * 28, 220)}ms`
      }}
      className={`group relative h-full w-full text-left rounded-xl overflow-hidden
        border border-white/[0.06]
        bg-gradient-to-b from-[rgba(15,22,35,0.72)] to-[rgba(10,16,24,0.6)]
        backdrop-blur-xl
        shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_-30px_rgba(0,0,0,0.9)]
        transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        hover:-translate-y-[3px]
        hover:border-accent-cyan/40
        hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_60px_-24px_rgba(34,211,238,0.35)]
        active:scale-[0.985] active:transition-transform active:duration-100
        flicker-in
        ${peerFading ? 'opacity-0 pointer-events-none scale-[0.985]' : 'opacity-100'}
        ${isOpening ? 'opacity-0 pointer-events-none' : ''}
      `}
    >
      {/* Hairline inner border — adds the JARVIS "etched" feel */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/[0.025]" />

      {/* Tile content */}
      <div className="absolute inset-0">
        <app.TilePreview />
      </div>

      {/* Cursor-tracked highlight glow (radial) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={
          pos
            ? {
                background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(34,211,238,0.10), transparent 50%)`
              }
            : undefined
        }
      />

      {/* Gradient corner sheen */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-accent-blue/[0.05] via-transparent to-accent-cyan/[0.06]" />

      {/* Bottom hairline accent on hover */}
      <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-accent-cyan/60 to-transparent" />
    </button>
  )
}
