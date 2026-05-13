// News (WSJ/Reuters RSS) shared types — main + renderer.

export type NewsSource = 'wsj' | 'reuters'

export type NewsItem = {
  id: string
  source: NewsSource
  title: string
  link: string
  description: string | null
  summary: string | null
  published_at: string | null
  fetched_at: string
}

export type NewsFetchResult = {
  fetched: number
  added: number
  lastFetchedAt: string
}
