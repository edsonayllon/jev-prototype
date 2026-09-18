import { SENTIMENT_LABELS, TYPE_LABELS } from '../../shared/types'
import type { Action, Filters, SortKey } from '../store'

function Toggle({
  on,
  onClick,
  tone,
  children,
}: {
  on: boolean
  onClick: () => void
  tone: string
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        on ? 'border-transparent text-white' : 'border-separator bg-surface text-text-3 line-through'
      }`}
      style={on ? { background: `var(--${tone})` } : undefined}
    >
      {children}
    </button>
  )
}

export function FilterBar({
  filters,
  sort,
  shown,
  total,
  dispatch,
}: {
  filters: Filters
  sort: SortKey
  shown: number
  total: number
  dispatch: (a: Action) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {TYPE_LABELS.map((l) => (
          <Toggle
            key={l}
            on={filters.types.has(l)}
            tone={l}
            onClick={() => dispatch({ type: 'toggleType', label: l })}
          >
            {l}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SENTIMENT_LABELS.map((l) => (
          <Toggle
            key={l}
            on={filters.sentiments.has(l)}
            tone={l}
            onClick={() => dispatch({ type: 'toggleSentiment', label: l })}
          >
            {l}
          </Toggle>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-text-2">
        <input
          type="checkbox"
          checked={filters.worthOnly}
          onChange={(e) => dispatch({ type: 'worthOnly', value: e.target.checked })}
        />
        worth only
      </label>
      <label className="flex items-center gap-1.5 text-xs text-text-2">
        sort
        <select
          className="rounded-md border border-separator bg-surface px-1.5 py-0.5 text-xs text-text"
          value={sort}
          onChange={(e) => dispatch({ type: 'sort', key: e.target.value as SortKey })}
        >
          <option value="attention">attention</option>
          <option value="novelty">novelty</option>
          <option value="recency">recency</option>
        </select>
      </label>
      <span className="ml-auto text-xs text-text-3">
        {shown} of {total}
      </span>
    </div>
  )
}
