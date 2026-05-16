// Real Obsidian vault graph rendered with @antv/g6 force-directed layout.
// Modes:
//   - ambient (default): drift, no controls, used as homescreen brain hero
//   - interactive + showLabels: full Brain page — click nodes to select,
//     highlightQuery filters/dims non-matching nodes.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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

  // Compute node/edge data
  const renderData = useMemo(() => {
    if (!data) return null
    const maxLinks = data.nodes.reduce((m, n) => Math.max(m, n.linkCount), 1)
    const q = highlightQuery.trim().toLowerCase()
    const matches = (title: string, id: string): boolean =>
      !q || title.toLowerCase().includes(q) || id.toLowerCase().includes(q)

    // Build set of selected node's neighbors for highlight
    const selectedNeighbors = new Set<string>()
    if (selectedId) {
      for (const e of data.edges) {
        if (e.source === selectedId) selectedNeighbors.add(e.target)
        if (e.target === selectedId) selectedNeighbors.add(e.source)
      }
    }

    const nodeData = data.nodes.map((n) => {
      const baseColor = NODE_COLOR[n.type] ?? NODE_COLOR.note
      const norm = maxLinks > 0 ? n.linkCount / maxLinks : 0
      const size = 8 + norm * 32
      const matched = matches(n.title, n.id)
      const isSelected = selectedId === n.id
      const isNeighbor = selectedId ? selectedNeighbors.has(n.id) : false
      const dimmed = selectedId ? (!isSelected && !isNeighbor) : (!matched && q.length > 0)

      return {
        id: n.id,
        data: { title: n.title, type: n.type, area: n.area, links: n.linkCount },
        style: {
          fill: baseColor,
          stroke: isSelected ? '#ffffff' : isNeighbor ? '#22d3ee' : baseColor,
          fillOpacity: dimmed ? 0.08 : isSelected ? 1.0 : isNeighbor ? 0.85 : 0.75,
          lineWidth: isSelected ? 3 : isNeighbor ? 1.5 : 0,
          size: isSelected ? size + 8 : isNeighbor ? size + 3 : size,
          shadowColor: isSelected ? baseColor : undefined,
          shadowBlur: isSelected ? 20 : 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          cursor: interactive ? 'pointer' : 'default',
          labelText: showLabels && (isSelected || isNeighbor || (matched && !dimmed && n.linkCount > 2))
            ? n.title
            : undefined,
          labelFill: isSelected ? '#ffffff' : isNeighbor ? '#cbd5e1' : '#94a3b8',
          labelFontSize: isSelected ? 13 : isNeighbor ? 11 : 10,
          labelFontWeight: isSelected ? 'bold' : 'normal',
          labelOffsetY: isSelected ? -(size / 2 + 12) : 8,
          labelPlacement: 'bottom' as const,
          labelBackground: isSelected || isNeighbor,
          labelBackgroundFill: '#04080f',
          labelBackgroundFillOpacity: 0.85,
          labelBackgroundRadius: 3,
          labelBackgroundPadding: [2, 6, 2, 6]
        }
      }
    })

    const edgeData = data.edges.map((e) => {
      const isSelectedEdge = selectedId && (e.source === selectedId || e.target === selectedId)
      const isDimmed = selectedId && !isSelectedEdge
      return {
        source: e.source,
        target: e.target,
        style: {
          stroke: isSelectedEdge ? '#22d3ee' : '#1a2a3a',
          strokeOpacity: isDimmed ? 0.05 : isSelectedEdge ? 0.7 : 0.35,
          lineWidth: isSelectedEdge ? 1.5 : 0.6
        }
      }
    })
    return { nodes: nodeData, edges: edgeData }
  }, [data, highlightQuery, selectedId, showLabels, interactive])

  // Handle node click with smooth zoom
  const handleNodeClick = useCallback((nodeId: string) => {
    onSelectRef.current?.(nodeId)
    const graph = graphRef.current
    if (!graph) return
    // Smooth zoom to the clicked node
    try {
      graph.focusElement(nodeId, {
        duration: 500,
        easing: 'ease-in-out'
      })
    } catch {
      // focusElement might not be available in all g6 versions
      try {
        graph.zoomTo(1.8, {
          duration: 500,
          easing: 'ease-in-out'
        })
      } catch { /* noop */ }
    }
  }, [])

  // Create graph once data is ready
  useEffect(() => {
    const el = containerRef.current
    if (!el || !data || !data.hasVault || data.nodes.length === 0 || !renderData) return
    if (graphRef.current) return

    const behaviors: string[] = []
    if (interactive) {
      behaviors.push('drag-canvas', 'zoom-canvas', 'drag-element')
    }

    const graph = new Graph({
      container: el,
      width: el.clientWidth,
      height: el.clientHeight,
      data: renderData,
      autoFit: 'view',
      padding: [40, 40, 40, 40],
      background: 'transparent',
      animation: {
        duration: 300,
        easing: 'ease-in-out'
      },
      layout: {
        type: 'd3-force',
        link: { distance: 45, strength: 0.4 },
        manyBody: { strength: -65, distanceMax: 350 },
        center: { x: el.clientWidth / 2, y: el.clientHeight / 2 },
        collide: { radius: 16, strength: 0.7 },
        animation: ambient,
        iterations: ambient ? undefined : 300
      },
      node: {
        type: 'circle',
        style: {
          cursor: interactive ? 'pointer' : 'default'
        }
      },
      edge: { type: 'line' },
      behaviors,
      zoomRange: [0.1, 5]
    })

    if (interactive) {
      graph.on('node:click', (evt: unknown) => {
        const target = (evt as { target?: { id?: string } })?.target
        const id = target?.id
        if (typeof id === 'string') handleNodeClick(id)
      })
      graph.on('canvas:click', () => {
        onSelectRef.current?.(null)
        // Zoom back to fit all
        try {
          graph.fitView({
            duration: 400,
            easing: 'ease-in-out'
          })
        } catch { /* noop */ }
      })

      // Hover: show tooltip with node title
      graph.on('node:mouseenter', (evt: unknown) => {
        const target = (evt as { target?: { id?: string } })?.target
        if (target?.id) {
          el.title = renderData.nodes.find(n => n.id === target.id)?.data?.title ?? ''
        }
      })
      graph.on('node:mouseleave', () => {
        el.title = ''
      })
    }

    graphRef.current = graph
    graph.render().catch((err) => console.error('[KnowledgeGraph] render failed:', err))

    const ro = new ResizeObserver(() => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
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
  }, [data?.hasVault, data?.scannedAt, interactive, ambient, handleNodeClick])

  // Apply style updates without recreating the graph
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
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {interactive && (
        <div className="absolute top-3 right-4 text-[10px] lowercase tracking-widest text-text-muted z-10 pointer-events-none opacity-50">
          scroll to zoom · drag to pan · click node to focus
        </div>
      )}
      <div className="absolute bottom-3 right-4 text-[10px] lowercase tracking-widest text-text-muted z-10 pointer-events-none">
        {data.noteCount} nodes · {data.edges.length} edges
      </div>
    </div>
  )
}
