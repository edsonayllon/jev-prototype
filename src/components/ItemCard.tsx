import { SENTIMENT_LABELS, TYPE_LABELS, type RankedItem } from '../../shared/types'
import { ProbBar } from './ProbBar'
import { TagPill } from './TagPill'
import { card, figures, label } from './ui'

const pct = (n: number) => `${Math.round(n * 100)}%`

function when(ms?: number) {
  if (!ms) return null
  const d = new Date(ms)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ItemCard({ item }: { item: RankedItem }) {
  const j = item.judgments
  const r = item.ranking
  const date = when(item.publishedAt)

  return (
    <article className={card}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {j && r ? (
          <>
            <TagPill
              tone={j.type.choice}
              unsure={r.unsureType}
              title={`confidence ${pct(j.type.confidence)}`}
            >
              {j.type.choice}
            </TagPill>
            {j.type.choice !== 'scam' && (
              <TagPill
                tone={j.sentiment.choice}
                unsure={r.unsureSentiment}
                title={`confidence ${pct(j.sentiment.confidence)}`}
              >
                {j.sentiment.choice}
              </TagPill>
            )}
            {r.flagged ? (
              <TagPill tone="flagged" title={`injection ${pct(j.injection)}`}>
                flagged
              </TagPill>
            ) : r.worth ? (
              <TagPill tone="worth">worth it</TagPill>
            ) : (
              <TagPill tone="muted">skip</TagPill>
            )}
          </>
        ) : (
          <TagPill tone="muted">untagged</TagPill>
        )}
        <span className={`ml-auto flex items-center gap-2 text-xs text-text-3 ${figures}`}>
          {item.engagement?.likes !== undefined && (
            <span>{item.engagement.likes.toLocaleString()} likes</span>
          )}
          {date && <span>{date}</span>}
        </span>
      </div>

      <p className="text-base leading-relaxed text-text">{item.text}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-text-2">
        {item.source && <span className="font-medium">{item.source}</span>}
        {item.url && (
          <a
            className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            open
          </a>
        )}
        {r && !r.flagged && (
          <span className="ml-auto flex items-center gap-2">
            <span>attention</span>
            <span className="relative h-1 w-24 overflow-hidden rounded-full bg-bar">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: pct(r.attention) }}
              />
            </span>
            <span className={`w-9 text-right ${figures}`}>{pct(r.attention)}</span>
          </span>
        )}
      </div>

      {j && r && (
        <details className="group/raw mt-3 border-t border-separator pt-2">
          <summary className="select-none text-xs font-medium text-text-2 transition-colors hover:text-text">
            <span className="group-open/raw:hidden">Show raw judgments</span>
            <span className="hidden group-open/raw:inline">Hide raw judgments</span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <h4 className={`mb-1 ${label} ${figures}`}>Type · confidence {pct(j.type.confidence)}</h4>
              {TYPE_LABELS.map((l) => (
                <ProbBar key={l} label={l} value={j.type.probabilities[l] ?? 0} tone={l} />
              ))}
            </div>
            <div className="space-y-1">
              <h4 className={`mb-1 ${label} ${figures}`}>
                Sentiment · confidence {pct(j.sentiment.confidence)}
              </h4>
              {SENTIMENT_LABELS.map((l) => (
                <ProbBar key={l} label={l} value={j.sentiment.probabilities[l] ?? 0} tone={l} />
              ))}
            </div>
            <div className="space-y-1">
              <h4 className={`mb-1 ${label} ${figures}`}>
                Novelty {j.novelty.score.toFixed(2)} / {j.novelty.max} · confidence{' '}
                {pct(j.novelty.confidence)}
              </h4>
              {Object.entries(j.novelty.probabilities)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([level, p]) => (
                  <ProbBar key={level} label={`level ${level}`} value={p} tone="accent" />
                ))}
            </div>
            <div className="space-y-1">
              <h4 className={`mb-1 ${label}`}>Signals (yes/no)</h4>
              <ProbBar label="material" value={j.material} tone="worth" />
              <ProbBar label="specific" value={j.specific} tone="worth" />
              <ProbBar label="injection" value={j.injection} tone="flagged" />
              <p className={`pt-2 text-xs text-text-3 ${figures}`}>
                base {r.breakdown.base.toFixed(3)} × credibility {r.breakdown.credibility.toFixed(3)} ={' '}
                {r.flagged ? '0 (flagged)' : r.attention.toFixed(3)}
              </p>
            </div>
          </div>
        </details>
      )}
    </article>
  )
}
