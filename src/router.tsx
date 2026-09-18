import { Suspense, lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout'
import { RouteErrorBoundary } from './components/route-error-boundary'
import { Skeleton } from './components/skeleton'
import { OverviewPage } from './features/repos/overview-page'
import { SettingsPage } from './features/settings/settings-page'

/**
 * The repository detail page is the only screen that draws Recharts, and Recharts is the
 * bulk of this build. Importing it here statically put it in the entry chunk, so the
 * landing page — which has no Recharts chart on it — paid for the whole charting library
 * before it could paint. Splitting it out is the difference between a cold visit loading
 * in under two seconds and not.
 *
 * The fallback is silent: `RepoPage` mounts with its own status region and announces the
 * load itself, and a chunk fetch is fast enough that announcing it twice would be noise.
 */
const RepoPage = lazy(() =>
  import('./features/repo/repo-page').then((module) => ({ default: module.RepoPage })),
)

/**
 * Every route carries an error boundary. The child boundaries matter more than the root
 * one: an error caught on a child renders inside the `Layout` `<Outlet />`, so the header,
 * navigation and rate-limit badge survive a failed panel. The root boundary is the
 * backstop for a failure in `Layout` itself, or a URL that matches nothing.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <OverviewPage />, errorElement: <RouteErrorBoundary /> },
      {
        path: 'repo/:owner/:name',
        element: (
          <Suspense fallback={<Skeleton rows={6} />}>
            <RepoPage />
          </Suspense>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      { path: 'settings', element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
