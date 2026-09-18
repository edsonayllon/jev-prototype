import type { RawItem } from './types'

const MIN_CHARS = 8
const LEADING_BULLET = /^(?:[-*•]|\d+[.)])\s+/

/** One post or headline per line. Dedupes and drops fragments too short to judge. */
export function parsePaste(text: string): RawItem[] {
  const seen = new Set<string>()
  const out: RawItem[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().replace(LEADING_BULLET, '')
    if (t.length < MIN_CHARS) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text: t })
  }
  return out
}
