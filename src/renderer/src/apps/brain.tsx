import { Brain as BrainIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MiniApp } from './types'
import { KnowledgeGraph } from '@components/brain/KnowledgeGraph'
import { Brain as BrainPage } from '@pages/Brain'
import type { BrainStatus } from '../../../shared/brain-types'

function TilePreview(): React.JSX.Element {
  const [status, setStatus] = useState<BrainStatus | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.api.brain
        .status()
        .then((s) => !cancelled && setStatus(s))
        .catch((err) => console.error('[brain-tile] status:', err))
    }
    load()
    const off = window.api.brain.onGraphChanged(load)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <KnowledgeGraph interactive={false} showLabels={false} ambient />
      </div>
      <div className="pointer-events-none absolute top-5 left-5 flex items-center gap-1.5 z-10">
        <BrainIcon size={13} strokeWidth={1.5} className="text-text-secondary" />
        <span className="text-[11px] lowercase tracking-wide text-text-secondary">brain</span>
      </div>
      {status && status.total > 0 && (
        <div className="pointer-events-none absolute bottom-5 left-5 z-10 text-[10px] lowercase tracking-widest text-text-muted">
          {status.total} notes
          {status.hasOpenAIKey && status.indexed > 0 ? ' · indexed' : ''}
        </div>
      )}
    </div>
  )
}

export const brainApp: MiniApp = {
  id: 'brain',
  label: 'brain',
  Icon: BrainIcon,
  span: { colSpan: 2 },
  TilePreview,
  FullApp: BrainPage
}
