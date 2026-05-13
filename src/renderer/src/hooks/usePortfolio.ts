import { useCallback, useEffect, useState } from 'react'
import type { PortfolioSummary, MacroChip } from '../../../shared/types'

export function usePortfolio(): {
  data: PortfolioSummary | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [data, setData] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await window.api.portfolio.get()
      setData(next)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { data, loading, error, refresh }
}

export function useMacro(): { data: MacroChip[]; refresh: () => Promise<void> } {
  const [data, setData] = useState<MacroChip[]>([])
  const refresh = useCallback(async () => {
    try {
      const next = await window.api.portfolio.macro()
      setData(next)
    } catch (err) {
      console.error('[macro]', err)
    }
  }, [])
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])
  return { data, refresh }
}
