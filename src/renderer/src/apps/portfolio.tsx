import { LineChart } from 'lucide-react'
import type { MiniApp } from './types'
import { PortfolioTileHud } from '@components/terminal/PortfolioTileHud'
import { usePortfolio } from '@hooks/usePortfolio'
import { Terminal } from '@pages/Terminal'

function TilePreview(): React.JSX.Element {
  const { data } = usePortfolio()
  return <PortfolioTileHud data={data} />
}

export const portfolioApp: MiniApp = {
  id: 'portfolio',
  label: 'portfolio',
  Icon: LineChart,
  TilePreview,
  FullApp: Terminal
}
