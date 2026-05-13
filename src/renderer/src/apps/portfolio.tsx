import { LineChart } from 'lucide-react'
import type { MiniApp } from './types'
import { Num } from '@components/common/Number'
import { TileHeader } from '@components/home/TileHeader'
import { usePortfolio } from '@hooks/usePortfolio'
import { Terminal } from '@pages/Terminal'

function TilePreview(): React.JSX.Element {
  const { data } = usePortfolio()
  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={LineChart}
        label="portfolio"
        right={<span className="text-[10px] lowercase text-text-muted">live</span>}
      />
      <div className="flex-1 flex flex-col justify-center">
        <Num
          value={data?.total_value ?? null}
          prefix="$"
          decimals={2}
          className="text-3xl text-text-primary leading-none"
        />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Num value={data?.day_pnl ?? null} prefix="$" signed colored decimals={2} />
          <span className="text-text-muted">·</span>
          <Num value={data?.day_pnl_pct ?? null} suffix="%" signed colored decimals={2} />
        </div>
      </div>
      <div className="text-[10px] lowercase text-text-muted">14 positions · incl. cash</div>
    </div>
  )
}

export const portfolioApp: MiniApp = {
  id: 'portfolio',
  label: 'portfolio',
  Icon: LineChart,
  TilePreview,
  FullApp: Terminal
}
