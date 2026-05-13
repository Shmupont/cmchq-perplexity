// Real Obsidian vault graph rendered with @antv/g6 force-directed layout.
// Used as both the brain tile preview (compact, non-interactive) and the
// full Brain mini-app (interactive, with labels).

import { useEffect, useRef, useState } from 'react'
import { Graph } from '@antv/g6'
import type { BrainGraph, BrainNodeType } from '../../../../shared/brain-types'
import { BrainConstellation } from '@components/home/BrainConstellation'

const NODE_COLOR: Record<BrainNodeType, string> = {
  hub: '#3b82f6',
  person: '#22d3ee',
  project: '#22c55e',
  topic: '#a855f7',
  document: '#64748b',
  contact: '#22d3ee',
  note: '#64748b'
}

type Props = {
  interactive?: boolean
  showLabels?: boolean
  ambient?: boolean // gentle drift/rotation; true for tile preview
}

export function KnowledgeGraph({
  interactive = false,
  showLabels = false,
  ambient = true
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const [data, setData] = useState<BrainGraph | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch the graph from the vault parser
  useEffect(() => {
    let cancelled = false
    window.api.brain
      .getGraph()
      .then((g) => {
        if (!cancelled) setData(g)
      })
      .catch((err) => console.error('[KnowledgeGraph] fetch failed:', err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Build graph instance once data lands
  useEffect(() => {
    const el = containerRef.current
    if (!el || !data || !data.hasVault || data.nodes.length === 0) return

    const minLinks = 0
    const maxLinks = data.nodes.reduce((m, n) => Math.max(m, n.linkCount), 1)

    const nodeData = data.nodes.map((n) => {
      const t = (NODE_COLOR[n.type] ?? NODE_COLOR.note) as string
      const norm = maxLinks > minLinks ? (n.linkCount - minLinks) / (maxLinks - minLinks) : 0
      const size = 6 + norm * 28
      return {
        id: n.id,
        data: { title: n.title, type: n.type, area: n.area, links: n.linkCount },
        style: {
          fill: t,
          stroke: t,
          fillOpacity: 0.85,
          lineWidth: 0,
          size,
          labelText: showLabels ? n.title : undefined,
          labelFill: '#94a3b8',
          labelFontSize: 10,
          labelOffsetY: 6,
          labelPlacement: 'bottom' as const
        }
      }
    })

    const edgeData = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      style: { stroke: '#1a2a3a', strokeOpacity: 0.5, lineWidth: 0.6 }
    }))

    const graph = new Graph({
      container: el,
      width: el.clientWidth,
      height: el.clientHeight,
      data: { nodes: nodeData, edges: edgeData },
      autoFit: 'view',
      background: 'transparent',
      layout: {
        type: 'd3-force',
        link: { distance: 38, strength: 0.5 },
        manyBody: { strength: -55 },
        center: { x: el.clientWidth / 2, y: el.clientHeight / 2 },
        collide: { radius: 14 },
        animation: ambient
      },
      node: { type: 'circle' },
      edge: { type: 'line' },
      behaviors: interactive ? ['drag-canvas', 'zoom-canvas', 'drag-element'] : []
    })

    graphRef.current = graph
    graph.render().catch((err) => console.error('[KnowledgeGraph] render failed:', err))

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        graph.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        graph.fitView()
      }
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      try {
        graph.destroy()
      } catch (err) {
        console.error('[KnowledgeGraph] destroy:', err)
      }
      graphRef.current = null
    }
  }, [data, interactive, showLabels, ambient])

  if (loading) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <BrainConstellation />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] lowercase tracking-widest text-text-muted animate-pulse">
            loading vault…
          </span>
        </div>
      </div>
    )
  }

  if (!data || !data.hasVault) {
    // Graceful fallback when vault is missing (e.g. running outside Coleman's box)
    return (
      <div className="relative w-full h-full overflow-hidden">
        <BrainConstellation />
        <div className="absolute bottom-3 right-4 text-[10px] lowercase tracking-widest text-text-muted z-10">
          vault offline
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[inherit]">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-3 right-4 text-[10px] lowercase tracking-widest text-text-muted z-10 pointer-events-none">
        {data.noteCount} nodes
      </div>
    </div>
  )
}
