import Parser from 'rss-parser'
import { stripHtml } from './text'
import type { RawItem } from './types'

const UA = 'Mozilla/5.0 (compatible; Tideline/0.1)'
const TIMEOUT_MS = 10_000
const SNIPPET_CHARS = 300

type Item = {
  title?: string
  contentSnippet?: string
  content?: string
  summary?: string
  link?: string
  isoDate?: string
}

export interface RssResult {
  title: string
  items: RawItem[]
}

async function fetchText(url: URL): Promise<{ status: number; contentType: string; body: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  })
  return { status: res.status, contentType: res.headers.get('content-type') ?? '', body: await res.text() }
}

/** An HTML page may advertise its feed; follow that once. */
export function discoverFeedUrl(html: string, base: URL): URL | null {
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  for (const tag of links) {
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue
    if (!/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (!href) continue
    try {
      return new URL(href, base)
    } catch {
      /* skip malformed href */
    }
  }
  return null
}

function toRaw(feedTitle: string, domain: string, item: Item): RawItem | null {
  const title = stripHtml(item.title ?? '')
  const snippet = stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? '').slice(0, SNIPPET_CHARS)
  const text = title && snippet && !snippet.startsWith(title) ? `${title} — ${snippet}` : title || snippet
  if (!text) return null
  const published = item.isoDate ? Date.parse(item.isoDate) : NaN
  return {
    text,
    source: domain || feedTitle,
    url: item.link,
    publishedAt: Number.isFinite(published) ? published : undefined,
  }
}

export async function fetchRss(url: URL): Promise<RssResult> {
  const parser = new Parser<Record<string, never>, Item>({ timeout: TIMEOUT_MS })
  let { status, contentType, body } = await fetchText(url)
  if (status >= 400) throw new Error(`The site returned HTTP ${status}.`)

  let feedUrl = url
  if (/text\/html/i.test(contentType) || /^\s*<!doctype html|^\s*<html/i.test(body)) {
    const discovered = discoverFeedUrl(body, url)
    if (!discovered) {
      throw new Error('That page is HTML with no RSS or Atom feed advertised. Paste the headlines instead.')
    }
    feedUrl = discovered
    ;({ status, body } = await fetchText(feedUrl))
    if (status >= 400) throw new Error(`The feed at ${feedUrl.host} returned HTTP ${status}.`)
  }

  const feed = await parser.parseString(body)
  const domain = feedUrl.hostname.replace(/^www\./, '')
  const items = feed.items
    .map((it) => toRaw(feed.title ?? domain, domain, it))
    .filter((r): r is RawItem => r !== null)
  return { title: feed.title?.trim() || domain, items }
}
