import { PortfolioOverview } from '@components/terminal/PortfolioOverview'
import { AllocationDonut } from '@components/terminal/AllocationDonut'
import { HoldingsGrid } from '@components/terminal/HoldingsGrid'
import { MacroBar } from '@components/terminal/MacroBar'
import { usePortfolio, useMacro } from '@hooks/usePortfolio'

export function Terminal(): React.JSX.Element {
  const { data, loading, error } = usePortfolio()
  const macro = useMacro()
  const rows = data?.rows ?? []

  return (
    <div className="flex flex-col h-full page-enter">
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-5 overflow-hidden">
        <PortfolioOverview data={data} loading={loading} />
        {error && (
          <div className="rounded-lg border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-negative flex items-center gap-2">
            <span className="status-dot is-warning" />
            Failed to load portfolio: {error}
          </div>
        )}
        <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr] gap-4">
          <AllocationDonut rows={rows} />
          <HoldingsGrid rows={rows} />
        </div>
      </div>
      <MacroBar chips={macro.data} />
    </div>
  )
}
