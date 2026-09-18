import { DEFAULT_RANKING, JEV, type RankingConfig } from './config'
import type { AnalyzedItem, Judgments, RankedItem, Ranking } from './types'

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const num = (b: boolean | undefined) => (b ? 1 : 0)

/** Pure composite score. Probabilities, not argmax labels, drive the penalties so
 *  a 55/45 news-vs-shill item degrades smoothly instead of flipping. Injection is
 *  a hard gate rather than a weight: nothing rescues a flagged item. */
export function scoreItem(j: Judgments, cfg: RankingConfig = DEFAULT_RANKING): Ranking {
  const p = j.type.probabilities
  const novelty01 = clamp01(j.novelty.score / JEV.noveltyMax)
  const base =
    cfg.weights.novelty * novelty01 + cfg.weights.material * j.material + cfg.weights.specific * j.specific
  const credibility =
    (1 - cfg.penalties.scam * (p.scam ?? 0)) *
    (1 - cfg.penalties.shill * (p.shill ?? 0)) *
    (1 - cfg.penalties.other * (p.other ?? 0))
  const flagged = j.injection >= cfg.injectionFlag
  const attention = flagged ? 0 : clamp01(base * credibility)
  return {
    attention,
    worth: !flagged && attention >= cfg.worthThreshold,
    flagged,
    unsureType: j.type.confidence < cfg.unsureConfidence,
    unsureSentiment: j.sentiment.confidence < cfg.unsureConfidence,
    breakdown: { novelty01, base, credibility },
  }
}

/** Order: unanalyzed last, flagged last, attention desc, newer first, original order. */
export function compareRanked(a: RankedItem, b: RankedItem): number {
  return (
    num(!a.ranking) - num(!b.ranking) ||
    num(a.ranking?.flagged) - num(b.ranking?.flagged) ||
    (b.ranking?.attention ?? 0) - (a.ranking?.attention ?? 0) ||
    (b.publishedAt ?? 0) - (a.publishedAt ?? 0) ||
    a.order - b.order
  )
}

export function rankItems(
  items: readonly AnalyzedItem[],
  cfg: RankingConfig = DEFAULT_RANKING,
): RankedItem[] {
  return items
    .map((it) => ({ ...it, ranking: it.judgments ? scoreItem(it.judgments, cfg) : null }))
    .sort(compareRanked)
}
