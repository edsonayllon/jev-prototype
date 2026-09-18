import type { SentimentLabel, TypeLabel } from '../../shared/types'

/**
 * Colour classes for Jev's labels, written out as literals so Tailwind's scanner
 * sees every class. Each tone is a pigment named in index.css; the verdict pills
 * (worth / skip) carry weight instead of hue so they never compete with a tag.
 */
export type PillTone = TypeLabel | SentimentLabel | 'worth' | 'flagged' | 'muted'
export type BarTone = TypeLabel | SentimentLabel | 'worth' | 'flagged' | 'accent'
export type ChipTone = TypeLabel | SentimentLabel

/** Tinted pill: soft wash of the tone behind toned text. */
export const SOFT: Record<PillTone, string> = {
  news: 'bg-news/15 text-news',
  opinion: 'bg-opinion/15 text-opinion',
  shill: 'bg-shill/15 text-shill',
  scam: 'bg-scam/15 text-scam',
  other: 'bg-other/15 text-other',
  bullish: 'bg-bullish/15 text-bullish',
  bearish: 'bg-bearish/15 text-bearish',
  neutral: 'bg-neutral/15 text-neutral',
  worth: 'bg-ink text-paper',
  flagged: 'bg-flagged/15 text-flagged',
  muted: 'bg-surface-2 text-text-2',
}

/** Filled chip: full tone behind paper text (filter toggles when on). */
export const SOLID: Record<ChipTone, string> = {
  news: 'bg-news text-paper',
  opinion: 'bg-opinion text-paper',
  shill: 'bg-shill text-paper',
  scam: 'bg-scam text-paper',
  other: 'bg-other text-paper',
  bullish: 'bg-bullish text-paper',
  bearish: 'bg-bearish text-paper',
  neutral: 'bg-neutral text-paper',
}

/** Full-strength fill for probability bars. */
export const FILL: Record<BarTone, string> = {
  news: 'bg-news',
  opinion: 'bg-opinion',
  shill: 'bg-shill',
  scam: 'bg-scam',
  other: 'bg-other',
  bullish: 'bg-bullish',
  bearish: 'bg-bearish',
  neutral: 'bg-neutral',
  worth: 'bg-worth',
  flagged: 'bg-flagged',
  accent: 'bg-accent',
}
