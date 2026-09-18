import { randomUUID } from 'node:crypto'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { JEV } from '../../shared/config'
import type { AnalyzeRequest, AnalyzeResponse } from '../../shared/types'
import { analyzeItems } from './jev/analyze'
import { makeClient } from './jev/client'
import { loadSource } from './sources'
import { SourceError } from './sources/resolve'

const TYPESAFE_API_KEY = defineSecret('TYPESAFE_API_KEY')

const clampLimit = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n)
    ? Math.max(1, Math.min(Math.floor(n), JEV.maxItems))
    : JEV.maxItems

function validate(data: unknown): AnalyzeRequest {
  const d = data as Partial<AnalyzeRequest> | null
  const s = d?.source as Partial<AnalyzeRequest['source']> | undefined
  if (s?.kind === 'url' && typeof s.url === 'string' && s.url.length <= 2048) {
    return { source: { kind: 'url', url: s.url }, limit: clampLimit(d?.limit) }
  }
  if (s?.kind === 'paste' && typeof s.text === 'string' && s.text.length <= 100_000) {
    return { source: { kind: 'paste', text: s.text }, limit: clampLimit(d?.limit) }
  }
  throw new HttpsError(
    'invalid-argument',
    'Send { source: { kind: "url", url } } or { source: { kind: "paste", text } }.',
  )
}

export const analyzeFeed = onCall<unknown, Promise<AnalyzeResponse>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [TYPESAFE_API_KEY],
  },
  async (req) => {
    const { source, limit } = validate(req.data)
    const runId = randomUUID()

    let loaded
    try {
      loaded = await loadSource(source, runId, limit)
    } catch (err) {
      if (err instanceof SourceError) throw new HttpsError('invalid-argument', err.message)
      throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to load the source.')
    }

    const keyHelp =
      'Locally: put it in functions/.secret.local. Deployed: firebase functions:secrets:set TYPESAFE_API_KEY.'
    let client
    try {
      client = makeClient(TYPESAFE_API_KEY.value())
    } catch {
      throw new HttpsError('failed-precondition', `TYPESAFE_API_KEY is not set. ${keyHelp}`)
    }
    const { items, usage, warnings, authError } = await analyzeItems(client, loaded.items)
    if (authError && usage.requests === 0) {
      throw new HttpsError(
        'failed-precondition',
        `TypeSafe rejected the API key (HTTP ${authError}). Check TYPESAFE_API_KEY. ${keyHelp}`,
      )
    }
    return {
      runId,
      resolvedSource: { kind: loaded.kind, label: loaded.label },
      items,
      usage,
      warnings: [...loaded.warnings, ...warnings],
    }
  },
)
