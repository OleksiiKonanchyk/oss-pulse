import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout'
import { RouteErrorBoundary } from './components/route-error-boundary'
import { LazyRepoPage } from './features/repo/lazy-repo-page'
import { OverviewPage } from './features/repos/overview-page'
import { SettingsPage } from './features/settings/settings-page'

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
        element: <LazyRepoPage />,
        errorElement: <RouteErrorBoundary />,
      },
      { path: 'settings', element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
