import { DEFAULT_RANKING, type RankingConfig } from '../shared/config'
import { compareRanked, rankItems } from '../shared/ranking'
import {
  SENTIMENT_LABELS,
  TYPE_LABELS,
  type AnalyzeResponse,
  type RankedItem,
  type SentimentLabel,
  type TypeLabel,
} from '../shared/types'

export type SortKey = 'attention' | 'novelty' | 'recency'

export interface Filters {
  types: ReadonlySet<TypeLabel>
  sentiments: ReadonlySet<SentimentLabel>
  worthOnly: boolean
}

export interface RecentRun {
  runId: string
  label: string
  at: number
  response: AnalyzeResponse
}

export interface State {
  status: 'idle' | 'loading' | 'done' | 'error'
  run: AnalyzeResponse | null
  error?: string
  filters: Filters
  sort: SortKey
  weights: RankingConfig
  recent: RecentRun[]
}

export type Action =
  | { type: 'submit' }
  | { type: 'done'; run: AnalyzeResponse; label: string }
  | { type: 'error'; message: string }
  | { type: 'load'; run: AnalyzeResponse }
  | { type: 'toggleType'; label: TypeLabel }
  | { type: 'toggleSentiment'; label: SentimentLabel }
  | { type: 'worthOnly'; value: boolean }
  | { type: 'sort'; key: SortKey }
  | { type: 'weights'; weights: RankingConfig }
  | { type: 'resetWeights' }
  | { type: 'clearRecent' }

export const RECENT_KEY = 'jev:runs'
export const RECENT_MAX = 10

export const initialFilters = (): Filters => ({
  types: new Set(TYPE_LABELS),
  sentiments: new Set(SENTIMENT_LABELS),
  worthOnly: false,
})

export const initialState = (): State => ({
  status: 'idle',
  run: null,
  filters: initialFilters(),
  sort: 'attention',
  weights: structuredClone(DEFAULT_RANKING),
  recent: loadRecent(),
})

function toggle<T>(set: ReadonlySet<T>, v: T): Set<T> {
  const next = new Set(set)
  if (next.has(v)) next.delete(v)
  else next.add(v)
  return next
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'submit':
      return { ...s, status: 'loading', error: undefined }
    case 'done': {
      const entry: RecentRun = { runId: a.run.runId, label: a.label, at: Date.now(), response: a.run }
      const recent = [entry, ...s.recent.filter((r) => r.runId !== a.run.runId)].slice(0, RECENT_MAX)
      saveRecent(recent)
      return { ...s, status: 'done', run: a.run, recent, filters: initialFilters() }
    }
    case 'error':
      return { ...s, status: 'error', error: a.message }
    case 'load':
      return { ...s, status: 'done', run: a.run, error: undefined, filters: initialFilters() }
    case 'toggleType':
      return { ...s, filters: { ...s.filters, types: toggle(s.filters.types, a.label) } }
    case 'toggleSentiment':
      return { ...s, filters: { ...s.filters, sentiments: toggle(s.filters.sentiments, a.label) } }
    case 'worthOnly':
      return { ...s, filters: { ...s.filters, worthOnly: a.value } }
    case 'sort':
      return { ...s, sort: a.key }
    case 'weights':
      return { ...s, weights: a.weights }
    case 'resetWeights':
      return { ...s, weights: structuredClone(DEFAULT_RANKING) }
    case 'clearRecent':
      saveRecent([])
      return { ...s, recent: [] }
  }
}

/** Sliders are free-form; scoring wants weights that sum to 1. */
export function normalizeWeights(cfg: RankingConfig): RankingConfig {
  const { novelty, material, specific } = cfg.weights
  const sum = novelty + material + specific
  if (sum <= 0) return { ...cfg, weights: { novelty: 1 / 3, material: 1 / 3, specific: 1 / 3 } }
  return { ...cfg, weights: { novelty: novelty / sum, material: material / sum, specific: specific / sum } }
}

export interface View {
  worth: RankedItem[]
  rest: RankedItem[]
  flagged: RankedItem[]
  total: number
  shown: number
}

/** Rank, filter, sort, and split into the three feed sections. Pure. */
export function buildView(
  run: AnalyzeResponse,
  filters: Filters,
  sort: SortKey,
  weights: RankingConfig,
): View {
  const ranked = rankItems(run.items, normalizeWeights(weights))
  const visible = ranked.filter((it) => {
    const j = it.judgments
    if (!j) return !filters.worthOnly
    if (!filters.types.has(j.type.choice)) return false
    if (j.type.choice !== 'scam' && !filters.sentiments.has(j.sentiment.choice)) return false
    if (filters.worthOnly && !it.ranking?.worth) return false
    return true
  })
  visible.sort(sorter(sort))
  return {
    worth: visible.filter((it) => it.ranking?.worth),
    rest: visible.filter((it) => !it.ranking?.worth && !it.ranking?.flagged),
    flagged: visible.filter((it) => it.ranking?.flagged),
    total: ranked.length,
    shown: visible.length,
  }
}

function sorter(key: SortKey): (a: RankedItem, b: RankedItem) => number {
  switch (key) {
    case 'attention':
      return compareRanked
    case 'novelty':
      return (a, b) =>
        (b.judgments?.novelty.score ?? -1) - (a.judgments?.novelty.score ?? -1) || compareRanked(a, b)
    case 'recency':
      return (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0) || a.order - b.order
  }
}

export function loadRecent(): RecentRun[] {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as RecentRun[]).filter((r) => r && r.runId && r.response) : []
  } catch {
    return []
  }
}

export function saveRecent(list: RecentRun[]): void {
  try {
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable or full: recent runs are a convenience only */
  }
}
