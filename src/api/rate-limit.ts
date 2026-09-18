export type RateLimit = {
  limit: number
  remaining: number
  resetAt: Date
}

export function readRateLimit(headers: Headers): RateLimit | null {
  const limit = headers.get('x-ratelimit-limit')
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')

  if (limit === null || remaining === null || reset === null) return null

  return {
    limit: Number(limit),
    remaining: Number(remaining),
    resetAt: new Date(Number(reset) * 1000),
  }
}

type Listener = (limit: RateLimit) => void

const listeners = new Set<Listener>()

/**
 * Every response carries the current quota, so the header indicator is fed by a
 * side channel rather than by a dedicated request that would itself cost quota.
 */
export function subscribeToRateLimit(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function publishRateLimit(limit: RateLimit): void {
  for (const listener of listeners) listener(limit)
}
