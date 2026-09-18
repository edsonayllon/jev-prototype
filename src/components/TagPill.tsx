import { SOFT, type PillTone } from './tone'

export type { PillTone } from './tone'

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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold small-caps tracking-wide transition-colors ${SOFT[tone]} ${
        unsure ? 'outline-dashed outline-1 outline-current/50' : ''
      }`}
    >
      {ARROW[tone]}
      {children}
      {unsure && <span className="normal-caps font-normal italic tracking-normal opacity-70">unsure</span>}
    </span>
  )
}
