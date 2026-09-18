import { APIError, type TypeSafeClient } from '@typesafe-ai/sdk'
import { JEV } from '../../../shared/config'
import type { AnalyzedItem, FeedItem } from '../../../shared/types'
import { buildQuestions, buildState, collectJudgments, type JevItem } from './batch'

export interface AnalyzeOptions {
  batchSize?: number
  concurrency?: number
  model?: string
}

export interface AnalyzeOutcome {
  items: AnalyzedItem[]
  usage: { requests: number; inputTokens: number; model: string }
  warnings: string[]
  /** HTTP status when TypeSafe rejected the credentials (401/403); the caller should surface it. */
  authError?: number
}

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function mapWithConcurrency<T, R>(
  inputs: readonly T[],
  limit: number,
  fn: (input: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(inputs.length)
  let next = 0
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++
      results[i] = await fn(inputs[i]!, i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, inputs.length) }, worker))
  return results
}

const describe = (err: unknown) =>
  err instanceof APIError ? `HTTP ${err.status}` : err instanceof Error ? err.message : String(err)

/** Judge every item. A failed batch yields `judgments: null` for its items plus a
 *  warning; the run still returns everything else. */
export async function analyzeItems(
  client: TypeSafeClient,
  feed: readonly FeedItem[],
  opts: AnalyzeOptions = {},
): Promise<AnalyzeOutcome> {
  const batchSize = opts.batchSize ?? JEV.batchSize
  const concurrency = opts.concurrency ?? JEV.concurrency
  const model = opts.model ?? JEV.model
  const warnings: string[] = []
  let inputTokens = 0
  let requests = 0
  let authError: number | undefined

  const batches = chunk(feed, batchSize)
  const results = await mapWithConcurrency(batches, concurrency, async (batch, b) => {
    const jevItems: JevItem[] = batch.map((it, i) => ({ id: i, text: it.text, source: it.source }))
    try {
      const res = await client.systemOne({
        state: buildState(jevItems),
        questions: buildQuestions(jevItems),
        model,
      })
      requests += 1
      inputTokens += res.usage.input_tokens
      const judgments = collectJudgments(jevItems, res.answers as Record<string, unknown>)
      return batch.map((it, i) => ({ ...it, judgments: judgments[i]! }))
    } catch (err) {
      if (err instanceof APIError && (err.status === 401 || err.status === 403)) authError = err.status
      warnings.push(
        `Batch ${b + 1} of ${batches.length} failed (${describe(err)}); ${batch.length} item(s) left untagged.`,
      )
      return batch.map((it) => ({ ...it, judgments: null }))
    }
  })

  return { items: results.flat(), usage: { requests, inputTokens, model }, warnings, authError }
}
