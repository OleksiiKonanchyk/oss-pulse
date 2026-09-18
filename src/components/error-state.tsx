import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isApiError, type ApiError } from '../api/errors'

function minutesUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000))
}

function describe(error: ApiError): { title: string; body: ReactNode } {
  switch (error.kind) {
    case 'rate-limited':
      return {
        title: 'GitHub rate limit reached',
        body: (
          <>
            <p>
              Anonymous requests are capped at 60 per hour. This one resets in about{' '}
              {minutesUntil(error.resetAt)} minutes, at{' '}
              {error.resetAt.toLocaleTimeString()}.
            </p>
            <p className="mt-2">
              <Link to="/settings" className="underline underline-offset-4">
                Add a token
              </Link>{' '}
              to raise the limit to 5,000 per hour. It stays in your browser.
            </p>
          </>
        ),
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
