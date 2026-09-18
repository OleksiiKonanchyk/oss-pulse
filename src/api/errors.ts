export type ApiError =
  | { kind: 'rate-limited'; resetAt: Date }
  | { kind: 'not-found' }
  | { kind: 'network' }
  | { kind: 'unknown'; status: number; message: string }

/** Carries a classified ApiError across the throw boundary into TanStack Query. */
export class GitHubError extends Error {
  readonly error: ApiError

  constructor(error: ApiError) {
    // Nothing renders `message` — components switch on `kind`, and leaking GitHub's prose
    // into the UI is what the designed screens exist to avoid. It goes here instead, where
    // it costs nothing and makes an unknown failure legible in devtools and in a test's
    // output rather than showing up as the bare word "unknown".
    super(error.kind === 'unknown' ? `${error.kind}: ${error.status} ${error.message}` : error.kind)
    this.name = 'GitHubError'
    this.error = error
  }
}

export function isApiError(value: unknown): value is GitHubError {
  return value instanceof GitHubError
}

/**
 * Given the errors from a set of sibling requests, returns the one error they all share —
 * or `null` if they failed differently, or if any of them succeeded.
 *
 * The distinction matters on the overview: three rows each failing with a quota error is
 * one condition (the budget is gone) and deserves the designed screen once, while one row
 * 404ing among two healthy ones is genuinely per-row and must not blank the table.
 */
export function sharedApiError(errors: readonly unknown[]): GitHubError | null {
  const [first, ...rest] = errors
  if (!isApiError(first)) return null

  const sameKind = rest.every(
    (error) => isApiError(error) && error.error.kind === first.error.kind,
  )

  return sameKind ? first : null
}

const ONE_HOUR_MS = 3_600_000

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown }
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

/**
 * `Retry-After` is defined as either a delay in seconds or an HTTP date, and GitHub sends
 * the seconds form — but a proxy in front of it may rewrite one into the other, so both
 * are read. Returns null for an absent or unparseable value, including the empty string
 * (`Number('')` is 0, which would otherwise read as "retry immediately").
 */
function parseRetryAfter(value: string | null): Date | null {
  if (value === null || value.trim().length === 0) return null

  const seconds = Number(value)
  if (Number.isFinite(seconds)) {
    return seconds > 0 ? new Date(Date.now() + seconds * 1000) : null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A 403 from GitHub means three different things, and the headers are what tell them
 * apart:
 *
 * - `x-ratelimit-remaining: 0` — the hourly quota is spent. Recoverable, with a known
 *   reset time.
 * - `retry-after`, with quota still on the clock — the *secondary* rate limit, which
 *   GitHub applies to bursts and concurrency. Equally recoverable, usually in under a
 *   minute, and it carries no `x-ratelimit-remaining` at all.
 * - neither — genuinely forbidden.
 *
 * The first two earn the countdown screen; treating the secondary limit as an unknown
 * error would tell a user "something went wrong" about the one failure that fixes itself.
 */
export function classifyResponse(response: Response, body: unknown): ApiError {
  const remaining = response.headers.get('x-ratelimit-remaining')
  const exhausted = remaining === '0'

  if (response.status === 403 || response.status === 429) {
    if (exhausted) {
      const reset = response.headers.get('x-ratelimit-reset')
      const resetAt = reset
        ? new Date(Number(reset) * 1000)
        : new Date(Date.now() + ONE_HOUR_MS)

      return { kind: 'rate-limited', resetAt }
    }

    const retryAt = parseRetryAfter(response.headers.get('retry-after'))
    if (retryAt) return { kind: 'rate-limited', resetAt: retryAt }
  }

  if (response.status === 404) return { kind: 'not-found' }

  return {
    kind: 'unknown',
    status: response.status,
    message: messageFrom(body, response.statusText || `HTTP ${response.status}`),
  }
}
