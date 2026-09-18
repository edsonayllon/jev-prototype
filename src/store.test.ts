import { describe, expect, it } from 'vitest'
import { DEFAULT_RANKING } from '../shared/config'
import type { AnalyzeResponse, AnalyzedItem, Judgments } from '../shared/types'
import { buildView, initialFilters, initialState, normalizeWeights, reducer } from './store'

type Over = {
  type?: Partial<Judgments['type']>
  material?: number
  specific?: number
  injection?: number
}

const j = (over: Over = {}): Judgments => ({
  type: {
    choice: 'news',
    confidence: 0.9,
    probabilities: { news: 0.9, opinion: 0.1, shill: 0, scam: 0, other: 0 },
    ...over.type,
  },
  sentiment: {
    choice: 'bullish',
    confidence: 0.8,
    probabilities: { bullish: 0.8, bearish: 0.1, neutral: 0.1 },
  },
  novelty: { score: 3, max: 3, confidence: 0.7, probabilities: {} },
  material: over.material ?? 0.9,
  specific: over.specific ?? 0.9,
  injection: over.injection ?? 0.01,
})

const item = (order: number, judgments: Judgments | null): AnalyzedItem => ({
  id: `r:${order}`,
  order,
  text: `t${order}`,
  judgments,
})

const run = (items: AnalyzedItem[]): AnalyzeResponse => ({
  runId: 'r',
  resolvedSource: { kind: 'paste', label: 'Pasted text' },
  items,
  usage: { requests: 1, inputTokens: 10, model: 'jev-latest' },
  warnings: [],
})

describe('buildView', () => {
  const items = [
    item(0, j()),
    item(
      1,
      j({ type: { choice: 'scam', probabilities: { news: 0, opinion: 0, shill: 0, scam: 1, other: 0 } } }),
    ),
    item(2, j({ injection: 0.95 })),
    item(3, null),
  ]

  it('splits into worth, rest, and flagged', () => {
    const v = buildView(run(items), initialFilters(), 'attention', DEFAULT_RANKING)
    expect(v.worth.map((i) => i.order)).toEqual([0])
    expect(v.rest.map((i) => i.order)).toEqual([1, 3])
    expect(v.flagged.map((i) => i.order)).toEqual([2])
    expect(v.total).toBe(4)
    expect(v.shown).toBe(4)
  })

  it('filters by type and keeps scams visible regardless of sentiment filter', () => {
    const f = initialFilters()
    f.sentiments = new Set(['bearish'])
    const v = buildView(run(items), f, 'attention', DEFAULT_RANKING)
    expect(v.worth).toHaveLength(0)
    expect(v.rest.map((i) => i.order)).toEqual([1, 3])
  })

  it('worthOnly hides everything but worth items, including untagged', () => {
    const v = buildView(run(items), { ...initialFilters(), worthOnly: true }, 'attention', DEFAULT_RANKING)
    expect(v.shown).toBe(1)
  })
})

describe('reducer', () => {
  it('toggles filters immutably', () => {
    const s0 = initialState()
    const s1 = reducer(s0, { type: 'toggleType', label: 'shill' })
    expect(s1.filters.types.has('shill')).toBe(false)
    expect(s0.filters.types.has('shill')).toBe(true)
    expect(reducer(s1, { type: 'toggleType', label: 'shill' }).filters.types.has('shill')).toBe(true)
  })

  it('records a finished run in recent and resets filters', () => {
    const s = reducer(reducer(initialState(), { type: 'toggleType', label: 'news' }), {
      type: 'done',
      run: run([]),
      label: 'x',
    })
    expect(s.status).toBe('done')
    expect(s.recent[0]?.runId).toBe('r')
    expect(s.filters.types.has('news')).toBe(true)
  })
})

describe('normalizeWeights', () => {
  it('scales weights to sum to 1 and survives all-zero', () => {
    const w = normalizeWeights({
      ...DEFAULT_RANKING,
      weights: { novelty: 2, material: 1, specific: 1 },
    }).weights
    expect(w.novelty + w.material + w.specific).toBeCloseTo(1)
    expect(w.novelty).toBeCloseTo(0.5)
    const z = normalizeWeights({
      ...DEFAULT_RANKING,
      weights: { novelty: 0, material: 0, specific: 0 },
    }).weights
    expect(z.novelty).toBeCloseTo(1 / 3)
  })
})
