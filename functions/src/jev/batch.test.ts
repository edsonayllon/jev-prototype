import { describe, expect, it } from 'vitest'
import { buildQuestions, buildState, collectJudgments, qid, type JevItem } from './batch'

const items: JevItem[] = Array.from({ length: 5 }, (_, id) => ({ id, text: `post ${id}`, source: '@u' }))

describe('buildQuestions', () => {
  it('emits six questions per item with item-indexed ids', () => {
    const q = buildQuestions(items)
    expect(Object.keys(q)).toHaveLength(30)
    for (const key of Object.keys(q)) expect(key).toMatch(/^i\d+_[a-z]+$/)
    const t = q[qid(3, 'type')]
    expect(JSON.stringify(t?.instructions)).toContain('`items[3].text`')
    expect(JSON.stringify(t?.instructions)).toContain('`items[3].source`')
  })

  it('keeps the prompt text stable (edit deliberately, then update the snapshot)', () => {
    expect({
      state: buildState(items.slice(0, 1)),
      questions: buildQuestions(items.slice(0, 1)),
    }).toMatchSnapshot()
  })
})

describe('buildState', () => {
  it('omits source when absent and sends nothing else', () => {
    expect(
      buildState([
        { id: 0, text: 'a' },
        { id: 1, text: 'b', source: 'x.com' },
      ]),
    ).toEqual({
      items: [
        { id: 0, text: 'a' },
        { id: 1, text: 'b', source: 'x.com' },
      ],
    })
  })
})

describe('collectJudgments', () => {
  const answersFor = (id: number) => ({
    [qid(id, 'type')]: {
      type: 'choice',
      choice: 'news',
      confidence: 0.8,
      probabilities: { news: 0.8, opinion: 0.1, shill: 0.05, scam: 0.03, other: 0.02 },
    },
    [qid(id, 'sentiment')]: {
      type: 'choice',
      choice: 'bullish',
      confidence: 0.7,
      probabilities: { bullish: 0.7, bearish: 0.1, neutral: 0.2 },
    },
    [qid(id, 'novelty')]: {
      type: 'score',
      score: 2.4,
      confidence: 0.6,
      legend: {},
      probabilities: { 0: 0, 1: 0.1, 2: 0.4, 3: 0.5 },
    },
    [qid(id, 'material')]: { type: 'noul', noul: 0.9 },
    [qid(id, 'specific')]: { type: 'noul', noul: 0.85 },
    [qid(id, 'injection')]: { type: 'noul', noul: 0.02 },
  })

  it('round-trips a batch of answers', () => {
    const two = items.slice(0, 2)
    const [a, b] = collectJudgments(two, { ...answersFor(0), ...answersFor(1) })
    expect(a?.type.choice).toBe('news')
    expect(a?.sentiment.probabilities.neutral).toBe(0.2)
    expect(a?.novelty).toEqual({
      score: 2.4,
      max: 3,
      confidence: 0.6,
      probabilities: { 0: 0, 1: 0.1, 2: 0.4, 3: 0.5 },
    })
    expect(a?.material).toBe(0.9)
    expect(b?.injection).toBe(0.02)
  })

  it('throws a clear error on a missing answer', () => {
    const partial = answersFor(0)
    delete (partial as Record<string, unknown>)[qid(0, 'specific')]
    expect(() => collectJudgments(items.slice(0, 1), partial)).toThrow(/i0_specific/)
  })

  it('throws on a mistyped answer', () => {
    const bad = { ...answersFor(0), [qid(0, 'material')]: { type: 'choice', choice: 'x' } }
    expect(() => collectJudgments(items.slice(0, 1), bad)).toThrow(/i0_material/)
  })

  it('throws on an unknown label', () => {
    const bad = {
      ...answersFor(0),
      [qid(0, 'type')]: { type: 'choice', choice: 'meme', confidence: 1, probabilities: { meme: 1 } },
    }
    expect(() => collectJudgments(items.slice(0, 1), bad)).toThrow(/unexpected choice "meme"/)
  })
})
