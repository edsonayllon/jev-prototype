import type { ChoiceResponse, NoulResponse, Question, ScoreResponse } from '@typesafe-ai/sdk'
import { JEV } from '../../../shared/config'
import {
  SENTIMENT_LABELS,
  TYPE_LABELS,
  type Judgments,
  type SentimentLabel,
  type TypeLabel,
} from '../../../shared/types'
import {
  injectionQuestion,
  materialQuestion,
  noveltyQuestion,
  sentimentQuestion,
  specificQuestion,
  typeQuestion,
} from './questions'

/** What Jev sees for one item. Nothing else goes into state. */
export interface JevItem {
  /** 0-based position within the batch; questions reference `items[id]`. */
  id: number
  text: string
  source?: string
}

export const QUESTION_NAMES = ['type', 'sentiment', 'novelty', 'material', 'specific', 'injection'] as const
export type QuestionName = (typeof QUESTION_NAMES)[number]

export const qid = (i: number, name: QuestionName) => `i${i}_${name}`

export function buildState(items: JevItem[]): { items: Record<string, string | number>[] } {
  return {
    items: items.map(({ id, text, source }) => {
      const entry: Record<string, string | number> = { id, text }
      if (source) entry.source = source
      return entry
    }),
  }
}

export function buildQuestions(items: JevItem[]): Record<string, Question> {
  const questions: Record<string, Question> = {}
  for (const { id } of items) {
    questions[qid(id, 'type')] = typeQuestion(id)
    questions[qid(id, 'sentiment')] = sentimentQuestion(id)
    questions[qid(id, 'novelty')] = noveltyQuestion(id)
    questions[qid(id, 'material')] = materialQuestion(id)
    questions[qid(id, 'specific')] = specificQuestion(id)
    questions[qid(id, 'injection')] = injectionQuestion(id)
  }
  return questions
}

type AnyAnswer = ChoiceResponse | NoulResponse | ScoreResponse

function pickChoice<L extends string>(a: ChoiceResponse, labels: readonly L[], key: string) {
  if (!labels.includes(a.choice as L)) throw new Error(`${key}: unexpected choice "${a.choice}"`)
  const probabilities = {} as Record<L, number>
  for (const l of labels) probabilities[l] = a.probabilities[l] ?? 0
  return { choice: a.choice as L, confidence: a.confidence, probabilities }
}

/** Map a batch's answers back onto its items. Answer types are checked at runtime
 *  because dynamically keyed questions lose the SDK's compile-time inference. */
export function collectJudgments(items: JevItem[], answers: Record<string, unknown>): Judgments[] {
  return items.map(({ id }) => {
    const get = <T extends AnyAnswer>(name: QuestionName, kind: T['type']): T => {
      const key = qid(id, name)
      const a = answers[key] as AnyAnswer | undefined
      if (!a || a.type !== kind) throw new Error(`missing or mistyped answer ${key} (wanted ${kind})`)
      return a as T
    }
    const novelty = get<ScoreResponse>('novelty', 'score')
    return {
      type: pickChoice<TypeLabel>(get<ChoiceResponse>('type', 'choice'), TYPE_LABELS, qid(id, 'type')),
      sentiment: pickChoice<SentimentLabel>(
        get<ChoiceResponse>('sentiment', 'choice'),
        SENTIMENT_LABELS,
        qid(id, 'sentiment'),
      ),
      novelty: {
        score: novelty.score,
        max: JEV.noveltyMax,
        confidence: novelty.confidence,
        probabilities: { ...novelty.probabilities } as Record<string, number>,
      },
      material: get<NoulResponse>('material', 'noul').noul,
      specific: get<NoulResponse>('specific', 'noul').noul,
      injection: get<NoulResponse>('injection', 'noul').noul,
    }
  })
}
