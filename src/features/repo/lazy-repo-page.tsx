import { Suspense, lazy } from 'react'
import { Skeleton } from '../../components/skeleton'

/**
 * The repository detail page is the only screen that draws Recharts, and Recharts is the
 * bulk of this build. Importing it statically from the router put it in the entry chunk,
 * so the landing page — which has no Recharts chart on it — downloaded the whole charting
 * library before it could paint.
 *
 * `RepoPage`'s own status region only exists once its chunk has finished loading, so
 * navigating here would otherwise announce nothing until then. The fallback carries a
 * status region of its own — present from first render, alongside the (decorative,
 * `aria-hidden`) `Skeleton` — to cover exactly that gap.
 */
const RepoPage = lazy(() =>
  import('./repo-page').then((module) => ({ default: module.RepoPage })),
)

function RepoPageFallback() {
  return (
    <>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading repository
      </span>
      <Skeleton rows={6} />
    </>
  )
}

export function LazyRepoPage() {
  return (
    <Suspense fallback={<RepoPageFallback />}>
      <RepoPage />
    </Suspense>
  )
}
