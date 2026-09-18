import type { FeedItem, ResolvedKind } from '../../../shared/types'

export interface SourceResult {
  kind: ResolvedKind
  /** Human label for the UI, e.g. "BBC News (rss)" or "@jack on X". */
  label: string
  items: FeedItem[]
  warnings: string[]
}

/** Item text before it becomes a FeedItem: adapters produce these, `finalize` numbers them. */
export interface RawItem {
  text: string
  source?: string
  url?: string
  publishedAt?: number
  engagement?: FeedItem['engagement']
}
