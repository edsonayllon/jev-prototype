import { describe, expect, it } from 'vitest'
import { DEFAULT_RANKING } from './config'
import { rankItems, scoreItem } from './ranking'
import type { AnalyzedItem, Judgments } from './types'

type Over = {
  type?: Partial<Judgments['type']>
  sentiment?: Partial<Judgments['sentiment']>
  novelty?: Partial<Judgments['novelty']>
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
    choice: 'neutral',
    confidence: 0.8,
    probabilities: { bullish: 0.1, bearish: 0.1, neutral: 0.8 },
    ...over.sentiment,
  },
  novelty: { score: 2, max: 3, confidence: 0.7, probabilities: {}, ...over.novelty },
  material: over.material ?? 0.8,
  specific: over.specific ?? 0.8,
  injection: over.injection ?? 0.05,
})

const item = (order: number, judgments: Judgments | null, publishedAt?: number): AnalyzedItem => ({
  id: `r:${order}`,
  order,
  text: `item ${order}`,
  judgments,
  publishedAt,
})

describe('scoreItem', () => {
  it('gives a certain scam zero attention', () => {
    const r = scoreItem(
      j({ type: { choice: 'scam', probabilities: { news: 0, opinion: 0, shill: 0, scam: 1, other: 0 } } }),
    )
    expect(r.attention).toBe(0)
    expect(r.worth).toBe(false)
    expect(r.flagged).toBe(false)
  })

  it('flags at exactly the injection threshold and not just below it', () => {
    expect(scoreItem(j({ injection: DEFAULT_RANKING.injectionFlag })).flagged).toBe(true)
    expect(scoreItem(j({ injection: DEFAULT_RANKING.injectionFlag })).attention).toBe(0)
    expect(scoreItem(j({ injection: DEFAULT_RANKING.injectionFlag - 0.01 })).flagged).toBe(false)
  })

  it('scores a perfect item at 1', () => {
    const r = scoreItem(
      j({
        type: { probabilities: { news: 1, opinion: 0, shill: 0, scam: 0, other: 0 } },
        novelty: { score: 3 },
        material: 1,
        specific: 1,
      }),
    )
    expect(r.attention).toBeCloseTo(1, 10)
    expect(r.worth).toBe(true)
  })

  it('halves credibility loss for a 50/50 news-shill split', () => {
    const r = scoreItem(
      j({ type: { probabilities: { news: 0.5, opinion: 0, shill: 0.5, scam: 0, other: 0 } } }),
    )
    expect(r.breakdown.credibility).toBeCloseTo(1 - 0.5 * DEFAULT_RANKING.penalties.shill, 10)
  })

  it('applies the worth threshold as >=', () => {
    // novelty01=0.5*0.4=0.2, material 0.5*0.35=0.175, specific 0.7*0.25=0.175 → base 0.55, credibility 1
    const at = j({
      type: { probabilities: { news: 1, opinion: 0, shill: 0, scam: 0, other: 0 } },
      novelty: { score: 1.5 },
      material: 0.5,
      specific: 0.7,
    })
    const cfg = { ...DEFAULT_RANKING, worthThreshold: 0.55 }
    expect(scoreItem(at, cfg).attention).toBeCloseTo(0.55, 10)
    expect(scoreItem(at, cfg).worth).toBe(true)
    expect(scoreItem({ ...at, specific: 0.69 }, cfg).worth).toBe(false)
  })

  it('marks low-confidence choices unsure without changing attention', () => {
    const sure = scoreItem(j())
    const unsure = scoreItem(j({ type: { confidence: 0.3 }, sentiment: { confidence: 0.2 } }))
    expect(unsure.unsureType).toBe(true)
    expect(unsure.unsureSentiment).toBe(true)
    expect(unsure.attention).toBe(sure.attention)
  })

  it('honors a custom config', () => {
    const cfg = { ...DEFAULT_RANKING, worthThreshold: 0.99 }
    expect(scoreItem(j(), cfg).worth).toBe(false)
  })
})

describe('rankItems', () => {
  it('orders: attention desc, flagged last, unanalyzed after flagged', () => {
    const items = [
      item(0, j({ novelty: { score: 1 } })),
      item(1, null),
      item(2, j({ injection: 0.9 })),
      item(3, j({ novelty: { score: 3 } })),
    ]
    expect(rankItems(items).map((i) => i.order)).toEqual([3, 0, 2, 1])
  })

  it('breaks attention ties by recency, then original order', () => {
    const same = j()
    const items = [item(0, same, 100), item(1, same, 300), item(2, same, 300), item(3, same)]
    expect(rankItems(items).map((i) => i.order)).toEqual([1, 2, 0, 3])
  })

  it('does not mutate its input', () => {
    const items = [item(0, j({ novelty: { score: 0 } })), item(1, j({ novelty: { score: 3 } }))]
    const copy = structuredClone(items)
    rankItems(items)
    expect(items).toEqual(copy)
  })
})
