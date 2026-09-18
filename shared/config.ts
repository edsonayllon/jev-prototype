/** All policy lives here. Changing a number never requires re-calling Jev. */

export interface RankingConfig {
  /** Sum to 1. Weighted mix of the three "is this worth reading" signals. */
  weights: { novelty: number; material: number; specific: number }
  /** credibility *= 1 - p(label) * penalty, for each penalized type label. */
  penalties: { scam: number; shill: number; other: number }
  /** injection noul >= this → flagged: attention forced to 0, sorted to the bottom. */
  injectionFlag: number
  /** attention >= this → "worth your attention". */
  worthThreshold: number
  /** Choice confidence below this → "unsure" badge (display only). */
  unsureConfidence: number
}

export const DEFAULT_RANKING: RankingConfig = {
  weights: { novelty: 0.4, material: 0.35, specific: 0.25 },
  penalties: { scam: 1.0, shill: 0.6, other: 0.5 },
  injectionFlag: 0.6,
  worthThreshold: 0.75,
  unsureConfidence: 0.6,
}

export const JEV = {
  model: 'jev-latest',
  /** Items per systemOne request. 1 is the accuracy baseline; see golden/run.ts --compare. */
  batchSize: 5,
  /** Concurrent requests per run. */
  concurrency: 4,
  /** Hard cap on items judged per run. */
  maxItems: 40,
  /** Item text is truncated to this many characters before it reaches Jev. */
  maxTextChars: 600,
  /** Novelty score rubric has levels 0..3. */
  noveltyMax: 3,
} as const
