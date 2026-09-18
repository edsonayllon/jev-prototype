import { FILL, type BarTone } from './tone'
import { figures } from './ui'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** One labeled horizontal probability bar. */
export function ProbBar({ label, value, tone = 'accent' }: { label: string; value: number; tone?: BarTone }) {
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 truncate text-text-2">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bar">
        <span className={`absolute inset-y-0 left-0 rounded-full ${FILL[tone]}`} style={{ width: pct(v) }} />
      </span>
      <span className={`w-10 shrink-0 text-right text-text-2 ${figures}`}>{pct(v)}</span>
    </div>
  )
}
