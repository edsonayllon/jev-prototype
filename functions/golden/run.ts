/**
 * Golden-set check against the real Jev model.
 *
 *   npm run golden                # batch size from shared/config (5)
 *   npm run golden -- --batch 1   # per-item requests
 *   npm run golden -- --compare   # run batch=1 and batch=5, list label disagreements
 *   npm run golden -- --no-cache  # ignore cached responses
 *
 * Reads TYPESAFE_API_KEY from the environment or from functions/.secret.local.
 * Responses are cached under golden/.cache by a hash of the exact request body,
 * so re-running after a ranking/config change is free and offline; editing any
 * question text changes the hash and re-calls. A full uncached run is roughly
 * 13 items x 1,300 tokens = 17k tokens, about $0.0007. Run it freely.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TypeSafeClient } from '@typesafe-ai/sdk'
import { DEFAULT_RANKING, JEV } from '../../shared/config'
import { scoreItem } from '../../shared/ranking'
import type { AnalyzedItem, SentimentLabel, TypeLabel } from '../../shared/types'
import { analyzeItems } from '../src/jev/analyze'
import { finalize } from '../src/sources/text'

interface GoldenPost {
  text: string
  source?: string
  expect: { type?: TypeLabel; sentiment?: SentimentLabel; worth?: boolean; flagged?: boolean }
  boundary?: string
}

const here = dirname(fileURLToPath(import.meta.url))
const cacheDir = join(here, '.cache')
const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const opt = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

function loadKey(): string {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY
  const secretFile = join(here, '..', '.secret.local')
  if (existsSync(secretFile)) {
    const m = /^TYPESAFE_API_KEY=(.+)$/m.exec(readFileSync(secretFile, 'utf8'))
    if (m?.[1]) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  console.error('No TYPESAFE_API_KEY in the environment or functions/.secret.local.')
  console.error('Get one at https://console.typesafe.ai/settings/keys')
  process.exit(2)
}

/** fetch wrapper that caches successful JSON responses by request-body hash. */
function cachingFetch(useCache: boolean): typeof fetch {
  mkdirSync(cacheDir, { recursive: true })
  return async (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : ''
    const key = createHash('sha256').update(body).digest('hex')
    const file = join(cacheDir, `${key}.json`)
    if (useCache && existsSync(file)) {
      return new Response(readFileSync(file, 'utf8'), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const res = await fetch(input, init)
    if (res.ok) {
      const text = await res.text()
      writeFileSync(file, text)
      return new Response(text, { status: res.status, headers: res.headers })
    }
    return res
  }
}

const fmt = (n: number | undefined) => (n === undefined ? '  -  ' : n.toFixed(2).padStart(5))
const pad = (s: string, n: number) => s.padEnd(n).slice(0, n)

function mark(expected: unknown, actual: unknown) {
  if (expected === undefined) return `${String(actual)}`
  return expected === actual ? `${String(actual)} ✓` : `${String(actual)} ✗ (want ${String(expected)})`
}

async function run(client: TypeSafeClient, posts: GoldenPost[], batchSize: number) {
  const items = finalize(
    posts.map((p) => ({ text: p.text, source: p.source })),
    'golden',
    posts.length,
  )
  const t0 = Date.now()
  const out = await analyzeItems(client, items, { batchSize })
  return { ...out, ms: Date.now() - t0 }
}

function report(posts: GoldenPost[], items: AnalyzedItem[]): number {
  let mismatches = 0
  console.log(
    `\n${pad('#', 3)} ${pad('type', 24)} ${pad('sentiment', 24)} ${pad('worth', 16)} conf  mat   spec  inj   attn  text`,
  )
  items.forEach((it, i) => {
    const p = posts[i]!
    const j = it.judgments
    if (!j) {
      mismatches += 1
      console.log(`${pad(String(i + 1), 3)} ${pad('UNTAGGED (batch failed)', 24)} ${pad(p.text, 60)}`)
      return
    }
    const r = scoreItem(j, DEFAULT_RANKING)
    const typeStr = mark(p.expect.type, j.type.choice)
    const sentStr =
      j.type.choice === 'scam' ? `(${j.sentiment.choice})` : mark(p.expect.sentiment, j.sentiment.choice)
    const worthActual = r.flagged ? 'flagged' : r.worth
    const worthStr =
      p.expect.flagged !== undefined ? mark('flagged', worthActual) : mark(p.expect.worth, worthActual)
    for (const s of [typeStr, sentStr, worthStr]) if (s.includes('✗')) mismatches += 1
    console.log(
      `${pad(String(i + 1), 3)} ${pad(typeStr, 24)} ${pad(sentStr, 24)} ${pad(worthStr, 16)} ${fmt(j.type.confidence)} ${fmt(j.material)} ${fmt(j.specific)} ${fmt(j.injection)} ${fmt(r.attention)} ${pad(p.text, 48)}${p.boundary ? `  [${p.boundary}]` : ''}`,
    )
  })
  return mismatches
}

async function main() {
  const posts = JSON.parse(readFileSync(join(here, 'posts.json'), 'utf8')) as GoldenPost[]
  const client = new TypeSafeClient({
    apiKey: loadKey(),
    fetch: cachingFetch(!flag('--no-cache')),
    timeout: 30_000,
  })
  const batch = Number(opt('--batch') ?? JEV.batchSize)

  const main = await run(client, posts, batch)
  console.log(
    `\nbatch=${batch}: ${main.usage.requests} request(s), ${main.usage.inputTokens} input tokens, ${main.ms} ms, model ${main.usage.model}`,
  )
  for (const w of main.warnings) console.log(`warning: ${w}`)
  let mismatches = report(posts, main.items)

  if (flag('--compare') && batch !== 1) {
    const single = await run(client, posts, 1)
    console.log(
      `\nbatch=1: ${single.usage.requests} request(s), ${single.usage.inputTokens} input tokens, ${single.ms} ms`,
    )
    let disagreements = 0
    single.items.forEach((s, i) => {
      const m = main.items[i]!
      if (!s.judgments || !m.judgments) return
      const diffs: string[] = []
      if (s.judgments.type.choice !== m.judgments.type.choice) {
        diffs.push(`type ${m.judgments.type.choice} vs ${s.judgments.type.choice}`)
      }
      // Sentiment is hidden for scams in the UI, so a scam-only disagreement is not a regression.
      const scam = s.judgments.type.choice === 'scam' || m.judgments.type.choice === 'scam'
      if (!scam && s.judgments.sentiment.choice !== m.judgments.sentiment.choice) {
        diffs.push(`sentiment ${m.judgments.sentiment.choice} vs ${s.judgments.sentiment.choice}`)
      }
      if (diffs.length) {
        disagreements += 1
        console.log(
          `  #${i + 1} batch=${batch} vs batch=1: ${diffs.join(', ')}  ${posts[i]!.text.slice(0, 60)}`,
        )
      }
    })
    console.log(
      disagreements
        ? `${disagreements} label disagreement(s) between batch sizes.`
        : 'Batch sizes agree on every label.',
    )
    mismatches += disagreements
  }

  console.log(`\n${mismatches} mismatch(es).`)
  process.exit(mismatches > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
