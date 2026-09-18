import { useEffect, useState } from 'react'
import { subscribeToRateLimit, type RateLimit } from '../api/rate-limit'

function useRateLimit(): RateLimit | null {
  const [limit, setLimit] = useState<RateLimit | null>(null)
  useEffect(() => subscribeToRateLimit(setLimit), [])

  return limit
}

/**
 * The region is rendered from the first paint, empty, rather than appearing with the first
 * response — the same pattern RepoRow, IssuesPanel and ContributorsCard follow, and for
 * the same reason. A live region created at the moment its content appears is frequently
 * not announced, because assistive technology never observed a transition: it simply finds
 * new text already in the tree. A region that already exists and then changes is announced
 * reliably.
 *
 * Empty, it is `sr-only`, so it takes no space in the header until there is a quota to
 * show.
 */
export function RateLimitBadge() {
  const limit = useRateLimit()
  const low = limit !== null && limit.remaining <= 10

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="rate-limit-badge"
      title={limit ? `Resets at ${limit.resetAt.toLocaleTimeString()}` : undefined}
      className={
        limit === null
          ? 'sr-only'
          : `rounded-full px-3 py-1 text-xs font-medium ${
              low
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`
      }
    >
      {limit === null ? '' : `${limit.remaining}/${limit.limit} API requests left`}
    </span>
  )
}
