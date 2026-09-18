import type { SourceInput } from '../../../shared/types'

export type Resolved =
  | { kind: 'paste'; text: string }
  | { kind: 'rss'; url: URL }
  | { kind: 'x'; url: URL; user: string; statusId: string }
  | { kind: 'x-unsupported'; url: URL }

/** A user-facing input problem; the callable maps it to `invalid-argument`. */
export class SourceError extends Error {}

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?fc[0-9a-f]{2}:.*|\[?fe80:.*)$/i

/** Only public http(s) URLs may be fetched from inside the function. */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new SourceError('That does not look like a URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SourceError('Only http(s) links are supported.')
  }
  if (PRIVATE_HOST.test(url.hostname) || !url.hostname.includes('.')) {
    throw new SourceError('Private or local addresses are not allowed.')
  }
  return url
}

const X_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'])
const STATUS_PATH = /^\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d+)/

export function resolveSource(input: SourceInput): Resolved {
  if (input.kind === 'paste') return { kind: 'paste', text: input.text }
  const url = assertPublicHttpUrl(input.url)
  if (X_HOSTS.has(url.hostname)) {
    const m = STATUS_PATH.exec(url.pathname)
    if (m) return { kind: 'x', url, user: m[1]!, statusId: m[2]! }
    return { kind: 'x-unsupported', url }
  }
  return { kind: 'rss', url }
}
