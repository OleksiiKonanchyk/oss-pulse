import { useRouteError } from 'react-router-dom'
import { ErrorState } from './error-state'

/**
 * React Router's built-in fallback is a developer screen ("Hey developer 👋 …"). This
 * renders the app's own designed error surface instead, and because `ErrorState`
 * switches on the classified `ApiError` union, a render-time failure that carries a
 * `GitHubError` — an exhausted quota, say — still gets its real screen rather than a
 * generic apology.
 *
 * Reloading is the honest retry here: the boundary caught a render, not a fetch, so
 * there is no query to refetch and the component tree below is already unmounted.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()

  return <ErrorState error={error} onRetry={() => window.location.reload()} />
}
