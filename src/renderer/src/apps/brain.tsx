import { Brain } from 'lucide-react'
import type { MiniApp } from './types'
import { KnowledgeGraph } from '@components/brain/KnowledgeGraph'

function TilePreview(): React.JSX.Element {
  return (
    <div className="relative h-full w-full">
      {/* Edge-to-edge live graph */}
      <div className="absolute inset-0">
        <KnowledgeGraph interactive={false} showLabels={false} ambient />
      </div>
      {/* Small label overlay top-left */}
      <div className="pointer-events-none absolute top-5 left-5 flex items-center gap-1.5 z-10">
        <Brain size={13} strokeWidth={1.5} className="text-text-secondary" />
        <span className="text-[11px] lowercase tracking-wide text-text-secondary">brain</span>
      </div>
    </div>
  )
}

function FullApp(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="px-6 py-4 border-b border-border flex items-baseline gap-4">
        <h1 className="text-base font-medium text-text-primary lowercase">brain</h1>
        <span className="text-[11px] lowercase text-text-muted">
          interactive obsidian graph · agent 2 wires note viewer + rag chat
        </span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <KnowledgeGraph interactive showLabels={false} ambient />
      </div>
    </div>
  )
}

export const brainApp: MiniApp = {
  id: 'brain',
  label: 'brain',
  Icon: Brain,
  span: { colSpan: 2 },
  TilePreview,
  FullApp
}
