/** Wire contract between the client and the `analyzeFeed` callable, plus the
 *  judgment shape everything downstream (ranking, UI, tests) depends on. */

export type SourceInput = { kind: 'url'; url: string } | { kind: 'paste'; text: string }

export interface AnalyzeRequest {
  source: SourceInput
  /** Cap on items sent to Jev; clamped server-side to JEV.maxItems. */
  limit?: number
}

export const TYPE_LABELS = ['news', 'opinion', 'shill', 'scam', 'other'] as const
export type TypeLabel = (typeof TYPE_LABELS)[number]

export const SENTIMENT_LABELS = ['bullish', 'bearish', 'neutral'] as const
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number]

export type ResolvedKind = 'rss' | 'x' | 'paste'

export interface FeedItem {
  /** Stable within a run: `${runId}:${order}`. */
  id: string
  /** Original position in the feed; the last-resort sort tiebreak. */
  order: number
  /** Exactly what Jev saw. */
  text: string
  /** Publisher domain or author handle, if known. Also sent to Jev. */
  source?: string
  /** For the card link only; never sent to Jev. */
  url?: string
  /** Epoch ms, if known. Code-side recency tiebreak; never sent to Jev. */
  publishedAt?: number
  /** UI only; never sent to Jev. */
  engagement?: { likes?: number; reposts?: number }
}

export interface ChoiceJudgment<L extends string> {
  choice: L
  confidence: number
  probabilities: Record<L, number>
}

export interface Judgments {
  type: ChoiceJudgment<TypeLabel>
  sentiment: ChoiceJudgment<SentimentLabel>
  novelty: { score: number; max: 3; confidence: number; probabilities: Record<string, number> }
  /** Noul: would this change an investor's decision if true? */
  material: number
  /** Noul: concrete, checkable details present? */
  specific: number
  /** Noul: tries to manipulate an automated reader? */
  injection: number
}

export interface AnalyzedItem extends FeedItem {
  /** null when the batch containing this item failed after retries. */
  judgments: Judgments | null
}

export interface AnalyzeResponse {
  runId: string
  resolvedSource: { kind: ResolvedKind; label: string }
  items: AnalyzedItem[]
  usage: { requests: number; inputTokens: number; model: string }
  warnings: string[]
}

/** Computed client-side from Judgments; never sent over the wire. */
export interface Ranking {
  attention: number
  worth: boolean
  flagged: boolean
  unsureType: boolean
  unsureSentiment: boolean
  breakdown: { novelty01: number; base: number; credibility: number }
}

export interface RankedItem extends AnalyzedItem {
  ranking: Ranking | null
}
