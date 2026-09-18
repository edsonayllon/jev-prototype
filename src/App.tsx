import { useMemo, useReducer } from 'react'
import type { SourceInput as Source } from '../shared/types'
import { analyzeFeed, describeError } from './api'
import { FeedList } from './components/FeedList'
import { FilterBar } from './components/FilterBar'
import { RankingControls } from './components/RankingControls'
import { RecentRuns } from './components/RecentRuns'
import { SourceInput } from './components/SourceInput'
import { isFirebaseConfigured } from './firebase/app'
import { buildView, initialState, reducer } from './store'
import { figures } from './components/ui'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const { run, filters, sort, weights } = state

  const view = useMemo(
    () => (run ? buildView(run, filters, sort, weights) : null),
    [run, filters, sort, weights],
  )

  async function submit(source: Source) {
    dispatch({ type: 'submit' })
    try {
      const res = await analyzeFeed({ source })
      dispatch({ type: 'done', run: res, label: res.resolvedSource.label })
    } catch (err) {
      dispatch({ type: 'error', message: describeError(err) })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-12 sm:px-6">
      <header className="mb-8 border-b border-separator pb-6">
        <h1 className="font-display text-4xl font-medium leading-none tracking-tight">Tideline</h1>
        <p className="mt-3 max-w-prose text-base italic text-text-2">
          Paste a feed or some posts. Jev tags each one by type, sentiment, and whether it deserves your
          attention, with the raw probabilities behind every tag.
        </p>
      </header>

      {!isFirebaseConfigured && (
        <p className="mb-4 rounded-md border border-shill/30 bg-shill/10 px-3 py-2 text-xs text-shill">
          No Firebase config found. Copy <code>.env.example</code> to <code>.env</code> and run{' '}
          <code>npm run emulators</code>.
        </p>
      )}

      <div className="space-y-4">
        <SourceInput busy={state.status === 'loading'} onSubmit={submit} />

        {state.status === 'error' && state.error && (
          <p role="alert" className="rounded-md border border-scam/30 bg-scam/10 px-3 py-2 text-sm text-scam">
            {state.error}
          </p>
        )}

        {run && view && (
          <>
            <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-text-3 ${figures}`}>
              <span className="text-sm font-medium text-text">{run.resolvedSource.label}</span>
              <span>{run.items.length} items</span>
              <span>
                {run.usage.requests} request{run.usage.requests === 1 ? '' : 's'}
              </span>
              <span>{run.usage.inputTokens.toLocaleString()} input tokens</span>
              <span>{run.usage.model}</span>
            </div>
            {run.warnings.length > 0 && (
              <ul className="space-y-1 rounded-md border border-shill/30 bg-shill/10 px-3 py-2 text-xs text-shill">
                {run.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <RankingControls weights={weights} dispatch={dispatch} />
            <FilterBar
              filters={filters}
              sort={sort}
              shown={view.shown}
              total={view.total}
              dispatch={dispatch}
            />
            <FeedList view={view} />
          </>
        )}

        <RecentRuns runs={state.recent} activeRunId={run?.runId} dispatch={dispatch} />
      </div>
    </div>
  )
}
