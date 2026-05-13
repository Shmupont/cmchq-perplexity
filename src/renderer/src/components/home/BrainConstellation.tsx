// Ambient placeholder for the brain graph hero on the Home page.
// Agent 2 will replace this with the real @antv/g6 force-directed graph
// (see KnowledgeGraph.tsx). Until then we render a synthesized constellation
// of nodes + lines that drifts and pulses to set the "alive" vibe.

import { useEffect, useRef } from 'react'

type Node = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: 'blue' | 'cyan' | 'purple' | 'gray'
  pulse: number
}

const HUES: Record<Node['hue'], string> = {
  blue: '#3b82f6',
  cyan: '#22d3ee',
  purple: '#a855f7',
  gray: '#64748b'
}

export function BrainConstellation(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let nodes: Node[] = []

    function resize(): void {
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function seed(): void {
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      const count = Math.min(140, Math.max(60, Math.floor((w * h) / 12000)))
      const hues: Node['hue'][] = ['blue', 'cyan', 'purple', 'gray']
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.4 + Math.random() * 3.6,
        hue: hues[Math.floor(Math.random() * hues.length)],
        pulse: Math.random() * Math.PI * 2
      }))
    }

    function frame(t: number): void {
      if (!canvas) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx!.clearRect(0, 0, w, h)

      // Edges first (nearby nodes connect, faintly)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 140 * 140) {
            const alpha = (1 - d2 / (140 * 140)) * 0.16
            ctx!.strokeStyle = `rgba(34, 211, 238, ${alpha})`
            ctx!.lineWidth = 0.6
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
        const pulse = 0.6 + 0.4 * Math.sin(t / 600 + n.pulse)
        const color = HUES[n.hue]
        ctx!.fillStyle = color
        ctx!.globalAlpha = 0.45 + 0.45 * pulse
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r * (0.85 + 0.25 * pulse), 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1

      raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-bg/80" />
      <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest text-text-muted">
        Brain graph · ambient preview
      </div>
    </div>
  )
}
