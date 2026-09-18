import { TypeSafeClient } from '@typesafe-ai/sdk'

export function makeClient(apiKey: string): TypeSafeClient {
  return new TypeSafeClient({
    apiKey,
    // Per-attempt; the SDK retries 408/429/5xx twice with backoff on top of this.
    timeout: 20_000,
    retry: { maxRetries: 2 },
  })
}
