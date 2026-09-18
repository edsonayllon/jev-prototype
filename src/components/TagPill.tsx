import type { SentimentLabel, TypeLabel } from '../../shared/types'

export type PillTone = TypeLabel | SentimentLabel | 'worth' | 'flagged' | 'muted'

const TONE: Record<PillTone, string> = {
  news: 'bg-news/15 text-news',
  opinion: 'bg-opinion/15 text-opinion',
  shill: 'bg-shill/15 text-shill',
  scam: 'bg-scam/15 text-scam',
  other: 'bg-other/15 text-other',
  bullish: 'bg-bullish/15 text-bullish',
  bearish: 'bg-bearish/15 text-bearish',
  neutral: 'bg-neutral/15 text-neutral',
  worth: 'bg-worth/15 text-worth',
  flagged: 'bg-flagged/15 text-flagged',
  muted: 'bg-surface-2 text-text-2',
}

const ARROW: Partial<Record<PillTone, string>> = { bullish: '▲ ', bearish: '▼ ', neutral: '● ' }

export function TagPill({
  tone,
  children,
  unsure = false,
  title,
}: {
  tone: PillTone
  children: React.ReactNode
  unsure?: boolean
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE[tone]} ${
        unsure ? 'outline-dashed outline-1 outline-current/50' : ''
      }`}
    >
      {ARROW[tone]}
      {children}
      {unsure && <span className="font-normal normal-case tracking-normal opacity-70">unsure</span>}
    </span>
  )
}
