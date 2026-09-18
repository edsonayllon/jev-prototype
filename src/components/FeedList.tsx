import type { RankedItem } from '../../shared/types'
import type { View } from '../store'
import { ItemCard } from './ItemCard'

function Section({
  title,
  hint,
  items,
  collapsed = false,
}: {
  title: string
  hint?: string
  items: RankedItem[]
  collapsed?: boolean
}) {
  if (items.length === 0) return null
  const header = (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-2">{title}</h2>
      <span className="text-xs text-text-3">{items.length}</span>
      {hint && <span className="text-xs text-text-3">· {hint}</span>}
    </div>
  )
  const list = (
    <div className="mt-3 space-y-3">
      {items.map((it) => (
        <ItemCard key={it.id} item={it} />
      ))}
    </div>
  )
  if (!collapsed) {
    return (
      <section>
        {header}
        {list}
      </section>
    )
  }
  return (
    <details className="group/section">
      <summary className="flex items-center gap-2">
        {header}
        <span className="text-xs text-accent group-open/section:hidden">show</span>
        <span className="hidden text-xs text-accent group-open/section:inline">hide</span>
      </summary>
      {list}
    </details>
  )
}

export function FeedList({ view }: { view: View }) {
  if (view.shown === 0) {
    return (
      <p className="rounded-2xl bg-surface p-6 text-center text-sm text-text-2 shadow-card">
        Nothing matches the current filters.
      </p>
    )
  }
  return (
    <div className="space-y-8">
      <Section title="Worth your attention" items={view.worth} />
      <Section title="The rest" hint="sorted, but below the attention bar" items={view.rest} />
      <Section
        title="Flagged"
        hint="tries to steer the classifier; ranked last on purpose"
        items={view.flagged}
        collapsed
      />
    </div>
  )
}
