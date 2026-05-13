// Real Obsidian vault graph rendered with @antv/g6 force-directed layout.
// Modes:
//   - ambient (default): drift, no controls, used as homescreen brain hero
//   - interactive + showLabels: full Brain page — click nodes to select,
//     highlightQuery filters/dims non-matching nodes.

import { useEffect, useMemo, useRef, useState } from 'react'
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
  note: '#94a3b8'
}

type Props = {
  interactive?: boolean
  showLabels?: boolean
  ambient?: boolean
  highlightQuery?: string
  selectedId?: string | null
  onSelectNode?: (id: string | null) => void
}

export function KnowledgeGraph({
  interactive = false,
  showLabels = false,
  ambient = true,
  highlightQuery = '',
  selectedId = null,
  onSelectNode
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const onSelectRef = useRef(onSelectNode)
  onSelectRef.current = onSelectNode

  const [data, setData] = useState<BrainGraph | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch graph + subscribe to vault changes
  useEffect(() => {
    let cancelled = false
    const fetch = (force = false): void => {
      window.api.brain
        .getGraph(force)
        .then((g) => {
          if (!cancelled) setData(g)
        })
        .catch((err) => console.error('[KnowledgeGraph] fetch failed:', err))
        .finally(() => !cancelled && setLoading(false))
    }
    fetch()
    const off = window.api.brain.onGraphChanged(() => fetch(true))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  // Compute node/edge data each render — cheap, used by both create + restyle paths
  const renderData = useMemo(() => {
    if (!data) return null
    const maxLinks = data.nodes.reduce((m, n) => Math.max(m, n.linkCount), 1)
    const q = highlightQuery.trim().toLowerCase()
    const matches = (title: string, id: string): boolean =>
      !q || title.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    const nodeData = data.nodes.map((n) => {
      const baseColor = NODE_COLOR[n.type] ?? NODE_COLOR.note
      const norm = maxLinks > 0 ? n.linkCount / maxLinks : 0
      const size = 6 + norm * 28
      const matched = matches(n.title, n.id)
      const isSelected = selectedId === n.id
      return {
        id: n.id,
        data: { title: n.title, type: n.type, area: n.area, links: n.linkCount },
        style: {
          fill: baseColor,
          stroke: isSelected ? '#22d3ee' : baseColor,
          fillOpacity: matched ? 0.9 : 0.18,
          lineWidth: isSelected ? 2 : 0,
          size: isSelected ? size + 4 : size,
          labelText: showLabels && (matched || isSelected) ? n.title : undefined,
          labelFill: matched ? '#cbd5e1' : '#475569',
          labelFontSize: 10,
          labelOffsetY: 6,
          labelPlacement: 'bottom' as const
        }
      }
    })
    const edgeData = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      style: {
        stroke: '#1a2a3a',
        strokeOpacity: q ? 0.18 : 0.5,
        lineWidth: 0.6
      }
    }))
    return { nodes: nodeData, edges: edgeData }
  }, [data, highlightQuery, selectedId, showLabels])

  // Create graph once data is ready
  useEffect(() => {
    const el = containerRef.current
    if (!el || !data || !data.hasVault || data.nodes.length === 0 || !renderData) return
    if (graphRef.current) return // already created — restyle effect handles updates

    const graph = new Graph({
      container: el,
      width: el.clientWidth,
      height: el.clientHeight,
      data: renderData,
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

    if (interactive) {
      graph.on('node:click', (evt: unknown) => {
        const target = (evt as { target?: { id?: string } })?.target
        const id = target?.id
        if (typeof id === 'string') onSelectRef.current?.(id)
      })
      graph.on('canvas:click', () => onSelectRef.current?.(null))
    }

    graphRef.current = graph
    graph.render().catch((err) => console.error('[KnowledgeGraph] render failed:', err))

    const ro = new ResizeObserver(() => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
        graphRef.current.fitView()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.hasVault, data?.scannedAt, interactive, ambient])

  // Apply style updates without recreating the graph (cheap)
  useEffect(() => {
    if (!graphRef.current || !renderData) return
    try {
      graphRef.current.setData(renderData)
      graphRef.current
        .render()
        .catch((err) => console.error('[KnowledgeGraph] restyle render:', err))
    } catch (err) {
      console.error('[KnowledgeGraph] restyle:', err)
    }
  }, [renderData])

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
        {data.noteCount} nodes · {data.edges.length} edges
      </div>
    </div>
  )
}
