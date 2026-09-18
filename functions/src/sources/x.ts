import { stripHtml } from './text'
import type { RawItem } from './types'

const UA = 'Mozilla/5.0 (compatible; JevFeedTriage/0.1)'
const TIMEOUT_MS = 10_000

interface SyndicationTweet {
  text?: string
  created_at?: string
  favorite_count?: number
  user?: { screen_name?: string; name?: string }
}

/** Public, unauthenticated endpoints only. The syndication CDN returns clean JSON;
 *  oEmbed is the documented fallback but returns HTML that has to be stripped. */
export async function fetchXPost(user: string, statusId: string): Promise<RawItem> {
  try {
    return await viaSyndication(user, statusId)
  } catch (first) {
    try {
      return await viaOEmbed(user, statusId)
    } catch (second) {
      const a = first instanceof Error ? first.message : String(first)
      const b = second instanceof Error ? second.message : String(second)
      throw new Error(`Could not read that post without the X API (${a}; ${b}). Paste its text instead.`)
    }
  }
}

async function viaSyndication(user: string, statusId: string): Promise<RawItem> {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${statusId}&token=a`
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`syndication HTTP ${res.status}`)
  const t = (await res.json()) as SyndicationTweet
  if (!t.text) throw new Error('syndication returned no text')
  const handle = t.user?.screen_name ?? user
  const published = t.created_at ? Date.parse(t.created_at) : NaN
  return {
    text: t.text,
    source: `@${handle}`,
    url: `https://x.com/${handle}/status/${statusId}`,
    publishedAt: Number.isFinite(published) ? published : undefined,
    engagement: typeof t.favorite_count === 'number' ? { likes: t.favorite_count } : undefined,
  }
}

async function viaOEmbed(user: string, statusId: string): Promise<RawItem> {
  const target = encodeURIComponent(`https://twitter.com/${user}/status/${statusId}`)
  const url = `https://publish.twitter.com/oembed?url=${target}&omit_script=true&dnt=true`
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`oembed HTTP ${res.status}`)
  const o = (await res.json()) as { html?: string }
  const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(o.html ?? '')?.[1]
  const text = stripHtml(p ?? '')
  if (!text) throw new Error('oembed returned no text')
  return { text, source: `@${user}`, url: `https://x.com/${user}/status/${statusId}` }
}
