import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isApiError, type ApiError } from '../api/errors'

const SECOND_MS = 1000

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / SECOND_MS)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Milliseconds left until `target`, recomputed every second. Computing it once at render
 * — which is what this screen used to do — produces a number that is wrong the moment it
 * is painted and stays on screen going staler, which is worse than showing nothing.
 *
 * The interval is cleared on unmount and again the moment the deadline passes, so an
 * error screen left open in a background tab is not a timer running forever.
 */
function useCountdown(target: Date): number {
  const targetTime = target.getTime()
  const [remaining, setRemaining] = useState(() => Math.max(0, targetTime - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(0, targetTime - Date.now())
      setRemaining(next)
      if (next === 0) clearInterval(id)
    }, SECOND_MS)

    return () => clearInterval(id)
  }, [targetTime])

  return remaining
}

function RateLimitBody({ resetAt }: { resetAt: Date }) {
  const remaining = useCountdown(resetAt)
  const resetTime = resetAt.toLocaleTimeString()

  return (
    <>
      {/*
        The wrapper below carries role="alert" — an assertive, atomic live region, so any
        text change inside it is re-announced in full. A clock ticking once a second would
        therefore interrupt a screen-reader user once a second. The ticking value is hidden
        from assistive technology and the absolute reset time, which never changes, carries
        the same information in the sentence itself.
      */}
      <p>
        Anonymous requests are capped at 60 per hour. This one resets at {resetTime}
        <span aria-hidden="true">
          {' — '}
          {remaining > 0 ? 'in ' : ''}
          <span data-testid="rate-limit-countdown" className="font-medium tabular-nums">
            {remaining > 0 ? formatCountdown(remaining) : 'any moment now'}
          </span>
        </span>
        .
      </p>
      <p className="mt-2">
        <Link to="/settings" className="underline underline-offset-4">
          Add a token
        </Link>{' '}
        to raise the limit to 5,000 per hour. It stays in your browser.
      </p>
    </>
  )
}

function describe(error: ApiError): { title: string; body: ReactNode } {
  switch (error.kind) {
    case 'rate-limited':
      return {
        title: 'GitHub rate limit reached',
        body: <RateLimitBody resetAt={error.resetAt} />,
      }
    case 'not-found':
      return {
        title: 'Repository not found',
        body: <p>It may have been renamed, made private, or deleted.</p>,
      }
    case 'network':
      return {
        title: 'Connection failed',
        body: <p>The request never reached GitHub. Check your connection and try again.</p>,
      }
    case 'unknown':
      return {
        title: 'Something went wrong',
        body: <p>GitHub replied with an unexpected error ({error.status}).</p>,
      }
  }
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const described = isApiError(error)
    ? describe(error.error)
    : { title: 'Something went wrong', body: <p>An unexpected error occurred.</p> }

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <h2 className="text-base font-medium">{described.title}</h2>
      <div className="mt-2 text-slate-700 dark:text-slate-300">{described.body}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded border border-slate-300 px-3 py-1.5 font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Try again
        </button>
      )}
    </div>
  )
}
