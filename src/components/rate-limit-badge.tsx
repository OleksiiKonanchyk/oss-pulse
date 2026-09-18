import { useEffect, useState } from 'react'
import { subscribeToRateLimit } from '../api/rate-limit'
import type { RateLimit } from '../api/rate-limit'

export function useRateLimit(): RateLimit | null {
  const [limit, setLimit] = useState<RateLimit | null>(null)
  useEffect(() => subscribeToRateLimit(setLimit), [])

  return limit
}

export function RateLimitBadge() {
  const limit = useRateLimit()
  if (!limit) return null

  const low = limit.remaining <= 10

  return (
    <span
      aria-live="polite"
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        low
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
      title={`Resets at ${limit.resetAt.toLocaleTimeString()}`}
    >
      {limit.remaining}/{limit.limit} API requests left
    </span>
  )
}
