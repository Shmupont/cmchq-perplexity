import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAppStore } from '@stores/appStore'
import { getApp } from '../../apps/registry'

const OPEN_MS = 300
const CLOSE_MS = 220

// Renders the currently open mini-app, animated from the tile's origin rect
// to fullscreen. Mounts on `openApp` set, unmounts after close animation completes.
export function MiniAppFrame(): React.JSX.Element | null {
  const openApp = useAppStore((s) => s.openApp)
  const phase = useAppStore((s) => s.phase)
  const originRect = useAppStore((s) => s.originRect)
  const close = useAppStore((s) => s.close)
  const finishPhase = useAppStore((s) => s.finishPhase)

  // Local animating state: starts at originRect, transitions to fullscreen.
  // 'enter' = starting (at origin rect), 'shown' = at full size, 'exit' = animating back.
  const [stage, setStage] = useState<'enter' | 'shown' | 'exit'>('enter')

  // When openApp changes (or phase shifts to opening), begin the enter animation
  // by setting stage to 'enter' first, then to 'shown' on next frame.
  useEffect(() => {
    if (openApp && phase === 'opening') {
      setStage('enter')
      const raf = requestAnimationFrame(() => {
        // Two RAFs to make sure the starting frame is committed before transitioning
        requestAnimationFrame(() => setStage('shown'))
      })
      const done = window.setTimeout(() => finishPhase(), OPEN_MS + 20)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(done)
      }
    }
    if (phase === 'closing') {
      setStage('exit')
      const done = window.setTimeout(() => finishPhase(), CLOSE_MS + 20)
      return () => clearTimeout(done)
    }
    return
  }, [openApp, phase, finishPhase])

  // Escape key closes the open app
  useEffect(() => {
    if (!openApp) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openApp, close])

  if (!openApp) return null
  const app = getApp(openApp)
  if (!app) return null

  // Compute style based on stage
  // - enter: position fixed at the originRect (tile position/size)
  // - shown: position fixed at viewport (top-bar reserved at top via inset adjustments handled by parent)
  // - exit: animate back to the originRect
  const TITLEBAR_HEIGHT = 44
  let frameStyle: React.CSSProperties

  if (!originRect) {
    frameStyle = {
      top: TITLEBAR_HEIGHT,
      left: 0,
      width: '100vw',
      height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
      transition: `all ${OPEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
    }
  } else if (stage === 'shown') {
    frameStyle = {
      top: TITLEBAR_HEIGHT,
      left: 0,
      width: '100vw',
      height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
      transition: `all ${OPEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
    }
  } else {
    // enter or exit — sit at the tile's origin rect
    frameStyle = {
      top: originRect.top,
      left: originRect.left,
      width: originRect.width,
      height: originRect.height,
      transition: stage === 'enter' ? 'none' : `all ${CLOSE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
    }
  }

  const contentOpacity = stage === 'shown' ? 1 : 0
  const contentTransition =
    stage === 'shown' ? `opacity 200ms ease-out ${OPEN_MS - 120}ms` : 'opacity 120ms ease-in'

  return (
    <div
      className="fixed z-40 rounded-xl overflow-hidden border border-white/[0.07] bg-surface/95 backdrop-blur-2xl shadow-[0_30px_140px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(34,211,238,0.04)]"
      style={frameStyle}
    >
      {/* Inner hairline ring */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/[0.025]" />

      {/* Top-edge accent — a thin RGB pulse line for the JARVIS feel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px divider-rgb opacity-70" />

      {/* Back button */}
      <button
        onClick={close}
        className="absolute top-3 left-3 z-50 h-8 w-8 rounded-md bg-surface-elevated/70 backdrop-blur border border-border/80 text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-all flex items-center justify-center group"
        aria-label="Back"
        title="Back (Esc)"
      >
        <ArrowLeft
          size={14}
          strokeWidth={1.75}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
      </button>

      <div
        className="absolute inset-0"
        style={{ opacity: contentOpacity, transition: contentTransition }}
      >
        <app.FullApp />
      </div>
    </div>
  )
}
