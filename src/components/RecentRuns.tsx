import type { Action, RecentRun } from '../store'
import { card, figures } from './ui'

export function RecentRuns({
  runs,
  activeRunId,
  dispatch,
}: {
  runs: RecentRun[]
  activeRunId?: string
  dispatch: (a: Action) => void
}) {
  if (runs.length === 0) return null
  return (
    <section className={card}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Recent runs</h2>
        <button
          type="button"
          className="text-xs text-text-3 transition-colors hover:text-text"
          onClick={() => dispatch({ type: 'clearRecent' })}
        >
          clear
        </button>
      </div>
      <ul className="space-y-1">
        {runs.map((r) => (
          <li key={r.runId}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'load', run: r.response })}
              aria-current={r.runId === activeRunId}
              className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-surface-2 ${
                r.runId === activeRunId ? 'bg-accent-soft' : ''
              }`}
            >
              <span className="truncate">{r.label}</span>
              <span className={`ml-auto shrink-0 text-xs text-text-3 ${figures}`}>
                {r.response.items.length} items ·{' '}
                {new Date(r.at).toLocaleTimeString([], { timeStyle: 'short' })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
