import { Suspense, lazy } from 'react'
import { Skeleton } from '../../components/skeleton'

/**
 * The repository detail page is the only screen that draws Recharts, and Recharts is the
 * bulk of this build. Importing it statically from the router put it in the entry chunk,
 * so the landing page — which has no Recharts chart on it — downloaded the whole charting
 * library before it could paint.
 *
 * The fallback is silent: `RepoPage` mounts with its own status region and announces the
 * load itself, and announcing a chunk fetch as well would be noise.
 */
const RepoPage = lazy(() =>
  import('./repo-page').then((module) => ({ default: module.RepoPage })),
)

export function LazyRepoPage() {
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <RepoPage />
    </Suspense>
  )
}
