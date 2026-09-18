import { httpsCallable } from 'firebase/functions'
import type { AnalyzeRequest, AnalyzeResponse } from '../shared/types'
import { functions } from './firebase/app'

export async function analyzeFeed(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const call = httpsCallable<AnalyzeRequest, AnalyzeResponse>(functions(), 'analyzeFeed', { timeout: 90_000 })
  const { data } = await call(req)
  return data
}

/** Callable errors carry a code like "functions/invalid-argument" plus the server message. */
export function describeError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    const code = 'code' in err && typeof err.code === 'string' ? err.code : ''
    if (code.endsWith('unavailable') || code.endsWith('internal')) {
      return `${err.message} (is the function running? try \`npm run emulators\`)`
    }
    return err.message
  }
  return String(err)
}
