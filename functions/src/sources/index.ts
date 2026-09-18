import { JEV } from '../../../shared/config'
import type { SourceInput } from '../../../shared/types'
import { parsePaste } from './paste'
import { resolveSource, SourceError } from './resolve'
import { fetchRss } from './rss'
import { finalize } from './text'
import type { RawItem, SourceResult } from './types'
import { fetchXPost } from './x'

export const X_TIMELINE_WARNING =
  'X profiles, searches, and timelines need the paid X API. Open the posts and paste their text instead.'

/** Turn a user-supplied source into feed items. Throws SourceError for user-facing input problems. */
export async function loadSource(
  input: SourceInput,
  runId: string,
  limit: number = JEV.maxItems,
): Promise<SourceResult> {
  const cap = Math.max(1, Math.min(limit, JEV.maxItems))
  const resolved = resolveSource(input)
  const warnings: string[] = []
  let kind: SourceResult['kind']
  let label: string
  let raw: RawItem[]

  switch (resolved.kind) {
    case 'paste': {
      kind = 'paste'
      label = 'Pasted text'
      raw = parsePaste(resolved.text)
      if (raw.length === 0) throw new SourceError('No lines to judge. Paste one post or headline per line.')
      break
    }
    case 'x': {
      kind = 'x'
      let item: RawItem
      try {
        item = await fetchXPost(resolved.user, resolved.statusId)
      } catch (err) {
        throw new SourceError(err instanceof Error ? err.message : String(err))
      }
      label = `${item.source} on X`
      raw = [item]
      break
    }
    case 'x-unsupported':
      throw new SourceError(X_TIMELINE_WARNING)
    case 'rss': {
      kind = 'rss'
      let feed
      try {
        feed = await fetchRss(resolved.url)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new SourceError(`Could not read a feed from ${resolved.url.hostname}: ${msg}`)
      }
      label = `${feed.title} (rss)`
      raw = feed.items
      if (raw.length === 0) throw new SourceError('The feed has no items.')
      break
    }
  }

  if (raw.length > cap) warnings.push(`Showing the first ${cap} of ${raw.length} items.`)
  return { kind, label, items: finalize(raw, runId, cap), warnings }
}
