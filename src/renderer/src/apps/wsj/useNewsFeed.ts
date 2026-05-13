import { useCallback, useEffect, useState } from 'react'
import type { NewsItem } from '../../../../shared/news-types'

export function useNewsFeed(limit = 40): {
  items: NewsItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const list = await window.api.news.list(limit)
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { items, loading, error, refresh }
}
