import { LineChart } from 'lucide-react'
import type { MiniApp } from './types'
import { Num } from '@components/common/Number'
import { TileHeader } from '@components/home/TileHeader'
import { usePortfolio } from '@hooks/usePortfolio'
import { Terminal } from '@pages/Terminal'

function TilePreview(): React.JSX.Element {
  const { data } = usePortfolio()
  const pnl = data?.day_pnl ?? null
  const positive = typeof pnl === 'number' && pnl > 0
  const negative = typeof pnl === 'number' && pnl < 0
  const positions = data?.rows?.length ?? null

  return (
    <div className="flex flex-col h-full justify-between p-5">
      <TileHeader
        Icon={LineChart}
        label="portfolio"
        right={
          <div className="flex items-center gap-1.5">
            <span className="status-dot is-live" />
            <span className="text-[10px] font-mono lowercase text-text-muted">live</span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col justify-center">
        <Num
          value={data?.total_value ?? null}
          prefix="$"
          decimals={2}
          className={`text-[34px] leading-none tracking-tight text-text-primary ${
            positive ? 'num-glow-pos' : negative ? 'num-glow-neg' : ''
          }`}
        />
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Num value={pnl} prefix="$" signed colored decimals={2} />
          <span className="text-text-muted">·</span>
          <Num value={data?.day_pnl_pct ?? null} suffix="%" signed colored decimals={2} />
          <span className="text-[10px] lowercase text-text-muted ml-1">today</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] lowercase text-text-muted">
        <span>
          {positions != null ? `${positions} positions · incl. cash` : 'loading positions…'}
        </span>
        <span className="font-mono">
          {data?.as_of
            ? new Date(data.as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      </div>
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
