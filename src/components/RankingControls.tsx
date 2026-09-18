import type { RankingConfig } from '../../shared/config'
import type { Action } from '../store'

function Slider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <label className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-xs">
      <span className="text-text-2" title={hint}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="text-right font-mono tabular-nums text-text-2">{value.toFixed(2)}</span>
    </label>
  )
}

/** Sliders over the ranking policy. Every change re-ranks locally; Jev is never re-called. */
export function RankingControls({
  weights,
  dispatch,
}: {
  weights: RankingConfig
  dispatch: (a: Action) => void
}) {
  const set = (patch: (w: RankingConfig) => RankingConfig) =>
    dispatch({ type: 'weights', weights: patch(weights) })
  const w = weights
  return (
    <details className="group rounded-2xl bg-surface p-4 shadow-card">
      <summary className="flex items-center justify-between text-sm font-medium">
        <span>Tune ranking</span>
        <span className="text-xs text-text-3">re-ranks instantly, no model calls</span>
      </summary>
      <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Attention weights (relative)
          </h4>
          <Slider
            label="novelty"
            value={w.weights.novelty}
            onChange={(v) => set((c) => ({ ...c, weights: { ...c.weights, novelty: v } }))}
          />
          <Slider
            label="material"
            value={w.weights.material}
            onChange={(v) => set((c) => ({ ...c, weights: { ...c.weights, material: v } }))}
          />
          <Slider
            label="specific"
            value={w.weights.specific}
            onChange={(v) => set((c) => ({ ...c, weights: { ...c.weights, specific: v } }))}
          />
          <Slider
            label="worth threshold"
            value={w.worthThreshold}
            onChange={(v) => set((c) => ({ ...c, worthThreshold: v }))}
            hint="attention at or above this is worth your attention"
          />
        </div>
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Penalties and gates
          </h4>
          <Slider
            label="scam penalty"
            value={w.penalties.scam}
            onChange={(v) => set((c) => ({ ...c, penalties: { ...c.penalties, scam: v } }))}
          />
          <Slider
            label="shill penalty"
            value={w.penalties.shill}
            onChange={(v) => set((c) => ({ ...c, penalties: { ...c.penalties, shill: v } }))}
          />
          <Slider
            label="other penalty"
            value={w.penalties.other}
            onChange={(v) => set((c) => ({ ...c, penalties: { ...c.penalties, other: v } }))}
          />
          <Slider
            label="injection flag"
            value={w.injectionFlag}
            onChange={(v) => set((c) => ({ ...c, injectionFlag: v }))}
            hint="injection probability at or above this is flagged"
          />
        </div>
      </div>
      <button
        type="button"
        className="mt-3 text-xs font-medium text-accent hover:underline"
        onClick={() => dispatch({ type: 'resetWeights' })}
      >
        Reset to defaults
      </button>
    </details>
  )
}
